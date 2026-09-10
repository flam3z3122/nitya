import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { canCatchUpPreviousPeriod, catchUpFor, streakFromHistory, isWeeklyHabit, todayKey, weekContains, weekDateKeys } from '@/lib/activity';
import { friendlyAuthMessage } from '@/lib/authErrors';
import { enqueueMutation, isNetworkFailure, readQueue, readSnapshot, writeQueue, writeSnapshot, clearOfflineData } from '@/lib/offlineStore';
import type { QueuedMutationInput } from '@/lib/offlineStore';
import { flushMutationQueue } from '@/lib/offlineSync';
import type { DataState, Goal, Habit, ProfileSettings, Task } from '@/types';

type TaskRow = { id: string; title: string; category: string; priority: Task['priority']; due_label: string | null; completed: boolean };
type HabitRow = { id: string; name: string; icon: string; color: Habit['color']; frequency: string; reminder_time?: string | null; created_at?: string };
type GoalRow = { id: string; title: string; notes?: string | null; target?: number | null; progress?: number | null };
type CompletionRow = { habit_id: string; completed_on: string };
type SkipRow = { habit_id: string; skipped_on: string };

function dateValue(value: string): string {
  return String(value).slice(0, 10);
}

function mapGoal(row: GoalRow): Goal {
  const target = Math.max(1, row.target ?? 10);
  const progress = Math.max(0, row.progress ?? 0);
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? '',
    target,
    progress: Math.min(progress, target),
  };
}

function skipsByHabit(rows: SkipRow[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const row of rows) {
    const key = dateValue(row.skipped_on);
    (map[row.habit_id] ??= []).push(key);
  }
  return map;
}

const initialState: DataState = { tasks: [], habits: [], goals: [], completions: [], profile: null, loading: true, error: null, offline: false, pendingSync: 0 };

function skipStorageKey(userId: string): string {
  return `daymark-habit-skips:${userId}`;
}

function readSkipMap(userId: string): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(skipStorageKey(userId)) ?? '{}') as Record<string, string[]>;
  } catch {
    return {};
  }
}

function writeSkipMap(userId: string, map: Record<string, string[]>) {
  localStorage.setItem(skipStorageKey(userId), JSON.stringify(map));
}

function mapNewHabit(habit: HabitRow): Habit {
  return {
    ...habit,
    reminder_time: habit.reminder_time ?? null,
    created_at: habit.created_at ?? new Date().toISOString(),
    completed: false,
    streak: 0,
    history: [],
    skips: [],
  };
}

function toFriendlyError(message: string): string {
  return `We couldn't load your workspace. ${message}`;
}

function mapProfile(row: {
  name: string;
  email: string;
  theme: ProfileSettings['theme'];
  notifications_enabled: boolean;
  timezone: string;
  onboarded: boolean;
  email_verified?: boolean | null;
}): ProfileSettings {
  return {
    name: row.name,
    email: row.email,
    theme: row.theme,
    notifications_enabled: row.notifications_enabled,
    timezone: row.timezone,
    onboarded: row.onboarded,
    email_verified: Boolean(row.email_verified),
  };
}

async function ensureProfile(userId: string, email: string): Promise<ProfileSettings | null> {
  const fullSelect = 'name, email, theme, notifications_enabled, timezone, onboarded, email_verified';
  const baseSelect = 'name, email, theme, notifications_enabled, timezone, onboarded';

  const existingFull = await supabase.from('profile_settings').select(fullSelect).eq('user_id', userId).maybeSingle();
  if (existingFull.data) return mapProfile(existingFull.data as Parameters<typeof mapProfile>[0]);
  if (existingFull.error?.message.includes('email_verified')) {
    const existingBase = await supabase.from('profile_settings').select(baseSelect).eq('user_id', userId).maybeSingle();
    if (existingBase.data) return mapProfile(existingBase.data as Parameters<typeof mapProfile>[0]);
  } else if (existingFull.data === null && !existingFull.error) {
    // no row yet
  } else if (existingFull.error) {
    return null;
  }

  const created = await supabase.from('profile_settings').insert({ user_id: userId, email }).select(fullSelect).maybeSingle();
  if (created.data) return mapProfile(created.data as Parameters<typeof mapProfile>[0]);
  if (created.error?.message.includes('email_verified')) {
    const createdBase = await supabase.from('profile_settings').select(baseSelect).eq('user_id', userId).maybeSingle();
    if (createdBase.data) return mapProfile(createdBase.data as Parameters<typeof mapProfile>[0]);
  }
  return null;
}

async function ensureWelcomeTask(): Promise<void> {
  const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
  if (count === 0) {
    await supabase.from('tasks').insert({ title: 'Welcome to daymark — tap the circle to complete me', category: 'Personal', priority: 'Medium', due_label: 'Anytime' });
  }
}

function snapshotToState(userId: string): DataState | null {
  const cached = readSnapshot(userId);
  if (!cached) return null;
  return {
    ...cached,
    loading: false,
    error: null,
    offline: typeof navigator !== 'undefined' && !navigator.onLine,
    pendingSync: readQueue(userId).length,
  };
}

export function useProductivityData(userId: string | null) {
  const [state, setState] = useState<DataState>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const syncingRef = useRef(false);

  const queueChange = useCallback((mutation: QueuedMutationInput) => {
    if (!userId) return;
    enqueueMutation(userId, mutation);
    setState((current) => ({ ...current, pendingSync: readQueue(userId).length, offline: true, error: null }));
  }, [userId]);

  const load = useCallback(async () => {
    if (!userId) { setState({ ...initialState, loading: false }); return; }
    const cached = snapshotToState(userId);
    if (cached) {
      setState(cached);
    } else {
      setState((current) => ({ ...current, loading: true, error: null, offline: !navigator.onLine }));
    }

    if (!navigator.onLine) {
      if (!cached) {
        setState({ ...initialState, loading: false, offline: true, error: toFriendlyError('Connect once so we can save your workspace on this device.') });
      }
      return;
    }

    if (!syncingRef.current) {
      syncingRef.current = true;
      const leftover = await flushMutationQueue(readQueue(userId));
      writeQueue(userId, leftover);
      setState((current) => ({ ...current, pendingSync: leftover.length }));
      syncingRef.current = false;
    }

    try {
      await ensureWelcomeTask();
    } catch {
      // Welcome task is optional while restoring a cached workspace.
    }
    try {
    let [tasksResult, habitsResult, goalsResult, completionsResult, skipsResult, profileResult] = await Promise.all([
      supabase.from('tasks').select('id, title, category, priority, due_label, completed').order('created_at', { ascending: true }),
      supabase.from('habits').select('id, name, icon, color, frequency, reminder_time, created_at').order('created_at', { ascending: true }),
      supabase.from('goals').select('id, title, notes, target, progress').order('created_at', { ascending: true }),
      supabase.from('habit_completions').select('habit_id, completed_on').order('completed_on', { ascending: false }),
      supabase.from('habit_skips').select('habit_id, skipped_on'),
      supabase.auth.getSession().then(({ data }) => data.session?.user ?? null),
    ]);
    if (habitsResult.error?.message.includes('reminder_time')) {
      habitsResult = await supabase.from('habits').select('id, name, icon, color, frequency, created_at').order('created_at', { ascending: true }) as typeof habitsResult;
    }
    if (goalsResult.error?.message.match(/notes|target|progress/)) {
      goalsResult = await supabase.from('goals').select('id, title').order('created_at', { ascending: true }) as typeof goalsResult;
    }
    const localSkips = readSkipMap(userId);
    let skipMap = localSkips;
    if (!skipsResult.error) {
      skipMap = skipsByHabit((skipsResult.data ?? []) as SkipRow[]);
      const pending: { habit_id: string; skipped_on: string }[] = [];
      for (const [habitId, dates] of Object.entries(localSkips)) {
        for (const date of dates) {
          if (!(skipMap[habitId] ?? []).includes(date)) {
            pending.push({ habit_id: habitId, skipped_on: date });
            (skipMap[habitId] ??= []).push(date);
          }
        }
      }
      if (pending.length > 0) {
        await supabase.from('habit_skips').upsert(pending, { onConflict: 'user_id,habit_id,skipped_on' });
        localStorage.removeItem(skipStorageKey(userId));
      } else if (Object.keys(localSkips).length > 0) {
        localStorage.removeItem(skipStorageKey(userId));
      }
    }
    const failure = tasksResult.error ?? habitsResult.error ?? goalsResult.error ?? completionsResult.error;
    if (failure) {
      if (cached) {
        setState((current) => ({ ...current, loading: false, error: null, offline: isNetworkFailure(failure), pendingSync: readQueue(userId).length }));
        return;
      }
      setState((current) => ({ ...current, loading: false, error: toFriendlyError(failure.message), offline: isNetworkFailure(failure) }));
      return;
    }
    if (readQueue(userId).length > 0) {
      setState((current) => ({
        ...(cached ?? current),
        loading: false,
        error: null,
        pendingSync: readQueue(userId).length,
      }));
      return;
    }
    const taskRows = (tasksResult.data ?? []) as TaskRow[];
    const habitRows = (habitsResult.data ?? []) as HabitRow[];
    const goalRows = (goalsResult.data ?? []) as GoalRow[];
    const completionRows = (completionsResult.data ?? []) as CompletionRow[];
    const today = todayKey();
    const sessionUser = profileResult as { id: string; email: string } | null;
    const profile = sessionUser ? await ensureProfile(sessionUser.id, sessionUser.email) : cached?.profile ?? null;
    setState({
      tasks: taskRows.map((task) => ({ ...task, time: task.due_label ?? 'Anytime' })),
      habits: habitRows.map((habit) => {
        const history = completionRows.filter((item) => item.habit_id === habit.id).map((item) => item.completed_on);
        const skips = skipMap[habit.id] ?? [];
        return {
          ...habit,
          reminder_time: habit.reminder_time ?? null,
          created_at: habit.created_at ?? new Date().toISOString(),
          completed: isWeeklyHabit(habit.frequency)
            ? weekContains(history)
            : history.includes(today),
          streak: streakFromHistory(history, habit.frequency, skips),
          history,
          skips,
        };
      }),
      goals: goalRows.map((goal) => mapGoal(goal)),
      completions: completionRows.map((item) => item.completed_on),
      profile,
      loading: false,
      error: null,
      offline: false,
      pendingSync: readQueue(userId).length,
    });
    } catch (error) {
      if (cached) {
        setState((current) => ({ ...current, loading: false, error: null, offline: true, pendingSync: readQueue(userId).length }));
        return;
      }
      setState((current) => ({
        ...current,
        loading: false,
        offline: true,
        error: toFriendlyError(isNetworkFailure(error) ? 'Connect once so we can save your workspace on this device.' : 'Please try again.'),
      }));
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!userId || state.loading) return;
    writeSnapshot(userId, {
      tasks: state.tasks,
      habits: state.habits,
      goals: state.goals,
      completions: state.completions,
      profile: state.profile,
    });
  }, [userId, state.loading, state.tasks, state.habits, state.goals, state.completions, state.profile]);

  useEffect(() => {
    const onOnline = () => { void load(); };
    const onOffline = () => setState((current) => ({ ...current, offline: true }));
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [load]);

  const toggleTask = useCallback(async (id: string, completed: boolean) => {
    setState((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, completed } : task) }));
    const { error } = await supabase.from('tasks').update({ completed, completed_at: completed ? new Date().toISOString() : null }).eq('id', id);
    if (!error) return;
    if (isNetworkFailure(error)) {
      queueChange({ kind: 'task-toggle', taskId: id, completed });
      return;
    }
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === id ? { ...task, completed: !completed } : task),
      error: 'That task could not be updated. Please try again.',
    }));
  }, [queueChange]);

  const toggleHabit = useCallback(async (id: string, completed: boolean) => {
    const today = todayKey();
    const habit = stateRef.current.habits.find((item) => item.id === id);
    const weekly = isWeeklyHabit(habit?.frequency ?? 'Daily');
    const weekKeys = weekDateKeys();
    setState((current) => ({
      ...current,
      habits: current.habits.map((item) => {
        if (item.id !== id) return item;
        const history = completed
          ? Array.from(new Set([today, ...item.history]))
          : weekly
            ? item.history.filter((date) => !weekKeys.includes(date))
            : item.history.filter((date) => date !== today);
        return { ...item, completed, history, streak: streakFromHistory(history, item.frequency, item.skips) };
      }),
      completions: completed
        ? [today, ...current.completions]
        : weekly
          ? current.completions.filter((date) => !weekKeys.includes(date))
          : current.completions.filter((date) => date !== today),
    }));
    const result = completed
      ? await supabase.from('habit_completions').upsert({ habit_id: id, completed_on: today }, { onConflict: 'user_id,habit_id,completed_on' })
      : weekly
        ? await supabase.from('habit_completions').delete().eq('habit_id', id).in('completed_on', weekKeys)
        : await supabase.from('habit_completions').delete().eq('habit_id', id).eq('completed_on', today);
    if (!result.error) return;
    if (isNetworkFailure(result.error)) {
      queueChange({ kind: 'habit-toggle', habitId: id, completed, today, weekly, weekKeys });
      return;
    }
    setState((current) => ({ ...current, error: 'That habit could not be updated. Please try again.' }));
    void load();
  }, [queueChange, load]);

  const createTask = useCallback(async (title: string, category = 'Personal', priority: Task['priority'] = 'Medium') => {
    const task: Task = { id: crypto.randomUUID(), title, category, priority, time: 'Anytime', completed: false };
    setState((current) => ({ ...current, tasks: [...current.tasks, task] }));
    const { error } = await supabase.from('tasks').insert({
      id: task.id,
      title,
      category,
      priority,
      due_label: 'Anytime',
    });
    if (!error) return;
    if (isNetworkFailure(error)) {
      queueChange({ kind: 'task-create', task });
      return;
    }
    setState((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== task.id) }));
    throw new Error('Task could not be created.');
  }, [queueChange]);

  const createGoal = useCallback(async (title: string, notes = '', target = 10, progress = 0) => {
    const safeTarget = Math.max(1, target);
    const goal: Goal = { id: crypto.randomUUID(), title, notes, target: safeTarget, progress: Math.min(Math.max(0, progress), safeTarget) };
    setState((current) => ({ ...current, goals: [...current.goals, goal] }));
    let { error } = await supabase.from('goals').insert({
      id: goal.id,
      title: goal.title,
      notes: goal.notes,
      target: goal.target,
      progress: goal.progress,
    });
    if (error && !isNetworkFailure(error)) {
      const fallback = await supabase.from('goals').insert({ id: goal.id, title: goal.title });
      error = fallback.error;
    }
    if (!error) return;
    if (isNetworkFailure(error)) {
      queueChange({ kind: 'goal-create', goal });
      return;
    }
    setState((current) => ({ ...current, goals: current.goals.filter((item) => item.id !== goal.id) }));
    throw new Error('Goal could not be created.');
  }, [queueChange]);

  const createHabitWithDetails = useCallback(async (name: string, icon: string, color: string, frequency: string) => {
    const row: HabitRow = {
      id: crypto.randomUUID(),
      name,
      icon,
      color: color as Habit['color'],
      frequency,
      reminder_time: null,
      created_at: new Date().toISOString(),
    };
    const habit = mapNewHabit(row);
    setState((current) => ({ ...current, habits: [...current.habits, habit] }));
    const { error } = await supabase.from('habits').insert({
      id: habit.id,
      name: habit.name,
      icon: habit.icon,
      color: habit.color,
      frequency: habit.frequency,
      reminder_time: habit.reminder_time,
    });
    if (!error) return;
    if (isNetworkFailure(error)) {
      queueChange({
        kind: 'habit-create',
        habit: {
          id: habit.id,
          name: habit.name,
          icon: habit.icon,
          color: habit.color,
          frequency: habit.frequency,
          reminder_time: habit.reminder_time,
          created_at: habit.created_at,
        },
      });
      return;
    }
    setState((current) => ({ ...current, habits: current.habits.filter((item) => item.id !== habit.id) }));
    throw new Error('Habit could not be created.');
  }, [queueChange]);

  const createHabit = useCallback(async (name: string) => {
    await createHabitWithDetails(name, '✦', 'mint', 'Daily');
  }, [createHabitWithDetails]);

  const updateTask = useCallback(async (id: string, updates: Partial<Pick<Task, 'title' | 'category' | 'priority' | 'time'>>) => {
    const payload: { title?: string; category?: string; priority?: Task['priority']; due_label?: string } = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.time !== undefined) payload.due_label = updates.time;
    const { error } = await supabase.from('tasks').update(payload).eq('id', id);
    if (error) {
      if (isNetworkFailure(error)) {
        queueChange({ kind: 'task-update', taskId: id, payload });
      } else {
        throw new Error('That task could not be updated. Please try again.');
      }
    }
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === id ? { ...task, ...updates } : task),
    }));
  }, [queueChange]);

  const updateHabit = useCallback(async (id: string, updates: Partial<Pick<Habit, 'name' | 'icon' | 'color' | 'frequency' | 'reminder_time'>>) => {
    const payload: Partial<Pick<Habit, 'name' | 'icon' | 'color' | 'frequency' | 'reminder_time'>> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.icon !== undefined) payload.icon = updates.icon;
    if (updates.color !== undefined) payload.color = updates.color;
    if (updates.frequency !== undefined) payload.frequency = updates.frequency;
    if (updates.reminder_time !== undefined) payload.reminder_time = updates.reminder_time;
    const { error } = await supabase.from('habits').update(payload).eq('id', id);
    if (error) {
      if (isNetworkFailure(error)) {
        queueChange({ kind: 'habit-update', habitId: id, payload });
      } else {
        throw new Error('That habit could not be updated. Please try again.');
      }
    }
    setState((current) => ({
      ...current,
      habits: current.habits.map((habit) => {
        if (habit.id !== id) return habit;
        const next = { ...habit, ...updates };
        next.completed = isWeeklyHabit(next.frequency) ? weekContains(next.history) : next.history.includes(todayKey());
        next.streak = streakFromHistory(next.history, next.frequency, next.skips);
        return next;
      }),
    }));
  }, [queueChange]);

  const updateGoal = useCallback(async (id: string, updates: Partial<Pick<Goal, 'title' | 'notes' | 'target' | 'progress'>>) => {
    const payload: Partial<Pick<Goal, 'title' | 'notes' | 'target' | 'progress'>> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.target !== undefined) payload.target = Math.max(1, updates.target);
    if (updates.progress !== undefined) payload.progress = Math.max(0, updates.progress);
    if (payload.target !== undefined && payload.progress === undefined) {
      const current = stateRef.current.goals.find((goal) => goal.id === id);
      if (current) payload.progress = Math.min(current.progress, payload.target);
    }
    if (payload.progress !== undefined && payload.target === undefined) {
      const current = stateRef.current.goals.find((goal) => goal.id === id);
      if (current) payload.progress = Math.min(payload.progress, current.target);
    }
    const { error } = await supabase.from('goals').update(payload).eq('id', id);
    if (error) {
      if (isNetworkFailure(error)) {
        queueChange({ kind: 'goal-update', goalId: id, payload });
      } else {
        throw new Error('That goal could not be updated. Please try again.');
      }
    }
    setState((current) => ({
      ...current,
      goals: current.goals.map((goal) => goal.id === id ? mapGoal({ ...goal, ...payload }) : goal),
    }));
  }, [queueChange]);

  const checkInGoal = useCallback(async (id: string) => {
    const goal = stateRef.current.goals.find((item) => item.id === id);
    if (!goal || goal.progress >= goal.target) return;
    await updateGoal(id, { progress: goal.progress + 1 });
  }, [updateGoal]);

  const deleteTask = useCallback(async (id: string) => {
    setState((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }));
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) return;
    if (isNetworkFailure(error)) {
      queueChange({ kind: 'task-delete', taskId: id });
      return;
    }
    setState((current) => ({ ...current, error: 'That task could not be deleted. Please try again.' }));
    void load();
  }, [queueChange, load]);

  const deleteHabit = useCallback(async (id: string) => {
    setState((current) => ({ ...current, habits: current.habits.filter((habit) => habit.id !== id) }));
    const { error } = await supabase.from('habits').delete().eq('id', id);
    if (!error) return;
    if (isNetworkFailure(error)) {
      queueChange({ kind: 'habit-delete', habitId: id });
      return;
    }
    setState((current) => ({ ...current, error: 'That habit could not be deleted. Please try again.' }));
    void load();
  }, [queueChange, load]);

  const deleteGoal = useCallback(async (id: string) => {
    setState((current) => ({ ...current, goals: current.goals.filter((goal) => goal.id !== id) }));
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (!error) return;
    if (isNetworkFailure(error)) {
      queueChange({ kind: 'goal-delete', goalId: id });
      return;
    }
    setState((current) => ({ ...current, error: 'That goal could not be deleted. Please try again.' }));
    void load();
  }, [queueChange, load]);

  const completeOnboarding = useCallback(async (name: string, selectedHabits: { name: string; icon: string; color: string; frequency: string }[]) => {
    if (!userId) return;
    const newHabits = selectedHabits.map((h) => mapNewHabit({
      id: crypto.randomUUID(),
      name: h.name,
      icon: h.icon,
      color: h.color as Habit['color'],
      frequency: h.frequency,
      reminder_time: null,
      created_at: new Date().toISOString(),
    }));
    setState((current) => ({
      ...current,
      profile: current.profile ? { ...current.profile, name, onboarded: true } : current.profile,
      habits: [...current.habits, ...newHabits],
    }));
    const { error: profileError } = await supabase.from('profile_settings').update({ name, onboarded: true, updated_at: new Date().toISOString() }).eq('user_id', userId);
    if (profileError) {
      if (isNetworkFailure(profileError)) {
        queueChange({ kind: 'profile-update', payload: { name, onboarded: true } });
        for (const habit of newHabits) {
          queueChange({
            kind: 'habit-create',
            habit: {
              id: habit.id,
              name: habit.name,
              icon: habit.icon,
              color: habit.color,
              frequency: habit.frequency,
              reminder_time: habit.reminder_time,
              created_at: habit.created_at,
            },
          });
        }
        return;
      }
      throw new Error('Could not save your profile.');
    }
    if (newHabits.length > 0) {
      const { error: habitsError } = await supabase.from('habits').insert(newHabits.map((h) => ({
        id: h.id,
        name: h.name,
        icon: h.icon,
        color: h.color,
        frequency: h.frequency,
      })));
      if (habitsError) {
        if (isNetworkFailure(habitsError)) {
          for (const habit of newHabits) {
            queueChange({
              kind: 'habit-create',
              habit: {
                id: habit.id,
                name: habit.name,
                icon: habit.icon,
                color: habit.color,
                frequency: habit.frequency,
                reminder_time: habit.reminder_time,
                created_at: habit.created_at,
              },
            });
          }
          return;
        }
        throw new Error('Could not save your habits.');
      }
    }
  }, [userId, queueChange]);

  const updateProfile = useCallback(async (updates: Partial<Pick<ProfileSettings, 'name' | 'theme' | 'notifications_enabled' | 'timezone'>>) => {
    if (!userId) return;
    setState((current) => ({ ...current, profile: current.profile ? { ...current.profile, ...updates } : current.profile }));
    const { error } = await supabase.from('profile_settings').update({ ...updates, updated_at: new Date().toISOString() }).eq('user_id', userId);
    if (!error) return;
    if (isNetworkFailure(error)) {
      queueChange({ kind: 'profile-update', payload: updates });
      return;
    }
    setState((current) => ({ ...current, error: 'Profile could not be updated. Please try again.' }));
  }, [userId, queueChange]);

  const markPreviousPeriod = useCallback(async (id: string) => {
    const habit = stateRef.current.habits.find((item) => item.id === id);
    if (!habit || !userId || !canCatchUpPreviousPeriod(habit)) return;
    const catchUp = catchUpFor(habit.frequency);
    const skips = habit.skips.filter((date) => date !== catchUp.skipKey);
    setState((current) => ({
      ...current,
      habits: current.habits.map((item) => {
        if (item.id !== id) return item;
        const history = Array.from(new Set([catchUp.completeOn, ...item.history]));
        return { ...item, history, skips, streak: streakFromHistory(history, item.frequency, skips) };
      }),
      completions: [catchUp.completeOn, ...current.completions],
    }));
    const { error } = await supabase.from('habit_completions').upsert({ habit_id: id, completed_on: catchUp.completeOn }, { onConflict: 'user_id,habit_id,completed_on' });
    if (error) {
      if (isNetworkFailure(error)) {
        queueChange({ kind: 'habit-complete-day', habitId: id, date: catchUp.completeOn });
        queueChange({ kind: 'habit-unskip', habitId: id, skipKey: catchUp.skipKey });
        return;
      }
      setState((current) => ({ ...current, error: 'That day could not be updated. Please try again.' }));
      return;
    }
    const skipDelete = await supabase.from('habit_skips').delete().eq('habit_id', id).eq('skipped_on', catchUp.skipKey);
    if (skipDelete.error) {
      if (isNetworkFailure(skipDelete.error)) {
        queueChange({ kind: 'habit-unskip', habitId: id, skipKey: catchUp.skipKey });
      }
      const skipMap = readSkipMap(userId);
      skipMap[id] = skips;
      writeSkipMap(userId, skipMap);
    }
  }, [userId, queueChange]);

  const skipPreviousPeriod = useCallback(async (id: string) => {
    const habit = stateRef.current.habits.find((item) => item.id === id);
    if (!habit || !userId || !canCatchUpPreviousPeriod(habit)) return;
    const catchUp = catchUpFor(habit.frequency);
    const skips = Array.from(new Set([...habit.skips, catchUp.skipKey]));
    setState((current) => ({
      ...current,
      habits: current.habits.map((item) => {
        if (item.id !== id) return item;
        return { ...item, skips, streak: streakFromHistory(item.history, item.frequency, skips) };
      }),
    }));
    const { error } = await supabase.from('habit_skips').upsert({ habit_id: id, skipped_on: catchUp.skipKey }, { onConflict: 'user_id,habit_id,skipped_on' });
    if (error) {
      if (isNetworkFailure(error)) queueChange({ kind: 'habit-skip', habitId: id, skipKey: catchUp.skipKey });
      const skipMap = readSkipMap(userId);
      skipMap[id] = skips;
      writeSkipMap(userId, skipMap);
    }
  }, [userId, queueChange]);

  const undoSkipPreviousPeriod = useCallback(async (id: string) => {
    const habit = stateRef.current.habits.find((item) => item.id === id);
    if (!habit || !userId) return;
    const catchUp = catchUpFor(habit.frequency);
    const skips = habit.skips.filter((date) => date !== catchUp.skipKey);
    setState((current) => ({
      ...current,
      habits: current.habits.map((item) => {
        if (item.id !== id) return item;
        return { ...item, skips, streak: streakFromHistory(item.history, item.frequency, skips) };
      }),
    }));
    const { error } = await supabase.from('habit_skips').delete().eq('habit_id', id).eq('skipped_on', catchUp.skipKey);
    if (error) {
      if (isNetworkFailure(error)) queueChange({ kind: 'habit-unskip', habitId: id, skipKey: catchUp.skipKey });
      const skipMap = readSkipMap(userId);
      skipMap[id] = skips;
      writeSkipMap(userId, skipMap);
    }
  }, [userId, queueChange]);

  const sendVerificationEmail = useCallback(async (): Promise<{ error: string | null }> => {
    if (!navigator.onLine) return { error: 'Connect to send a verification email.' };
    const email = stateRef.current.profile?.email;
    if (!email) return { error: 'No email on file.' };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/#/profile`,
      },
    });
    if (error) return { error: friendlyAuthMessage(error, 'reset') };
    return { error: null };
  }, []);

  const confirmEmail = useCallback(async (payload: { token?: string; token_hash?: string; type?: string }): Promise<{ error: string | null }> => {
    if (!navigator.onLine) return { error: 'Connect to verify your email.' };
    const { data: session } = await supabase.auth.getSession();
    const accessToken = session.session?.access_token;
    if (!accessToken) return { error: 'Sign in to verify your email.' };
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${baseUrl}/functions/v1/confirm-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: string };
      return { error: body.error ?? 'Could not verify your email. Please try again.' };
    }
    setState((current) => ({
      ...current,
      profile: current.profile ? { ...current.profile, email_verified: true } : current.profile,
    }));
    return { error: null };
  }, []);

  const deleteAccount = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) throw new Error('You must be signed in to delete your account.');
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${baseUrl}/functions/v1/delete-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? 'Could not delete account. Please try again or contact support.');
    }
    if (userId) clearOfflineData(userId);
  }, [userId]);

  return { ...state, reload: load, toggleTask, toggleHabit, markPreviousPeriod, skipPreviousPeriod, undoSkipPreviousPeriod, createTask, createHabit, createHabitWithDetails, createGoal, checkInGoal, updateTask, updateHabit, updateGoal, deleteTask, deleteHabit, deleteGoal, updateProfile, completeOnboarding, sendVerificationEmail, confirmEmail, deleteAccount };
}
