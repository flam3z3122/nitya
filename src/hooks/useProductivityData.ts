import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { catchUpFor, streakFromHistory, isWeeklyHabit, todayKey, weekContains, weekDateKeys } from '@/lib/activity';
import type { DataState, Goal, Habit, ProfileSettings, Task } from '@/types';

type TaskRow = { id: string; title: string; category: string; priority: Task['priority']; due_label: string | null; completed: boolean };
type HabitRow = { id: string; name: string; icon: string; color: Habit['color']; frequency: string; reminder_time?: string | null };
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

const initialState: DataState = { tasks: [], habits: [], goals: [], completions: [], profile: null, loading: true, error: null };

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

function toFriendlyError(message: string): string {
  return `We couldn't load your workspace. ${message}`;
}

async function ensureProfile(userId: string, email: string): Promise<ProfileSettings | null> {
  const { data: existing } = await supabase.from('profile_settings').select('name, email, theme, notifications_enabled, timezone, onboarded').eq('user_id', userId).maybeSingle();
  if (existing) return existing as ProfileSettings;
  const { data: created, error } = await supabase.from('profile_settings').insert({ user_id: userId, email }).select('name, email, theme, notifications_enabled, timezone, onboarded').maybeSingle();
  if (error || !created) return null;
  return created as ProfileSettings;
}

async function ensureWelcomeTask(): Promise<void> {
  const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
  if (count === 0) {
    await supabase.from('tasks').insert({ title: 'Welcome to daymark — tap the circle to complete me', category: 'Personal', priority: 'Medium', due_label: 'Anytime' });
  }
}

export function useProductivityData(userId: string | null) {
  const [state, setState] = useState<DataState>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const load = useCallback(async () => {
    if (!userId) { setState({ ...initialState, loading: false }); return; }
    setState((current) => ({ ...current, loading: true, error: null }));
    await ensureWelcomeTask();
    let [tasksResult, habitsResult, goalsResult, completionsResult, skipsResult, profileResult] = await Promise.all([
      supabase.from('tasks').select('id, title, category, priority, due_label, completed').order('created_at', { ascending: true }),
      supabase.from('habits').select('id, name, icon, color, frequency, reminder_time').order('created_at', { ascending: true }),
      supabase.from('goals').select('id, title, notes, target, progress').order('created_at', { ascending: true }),
      supabase.from('habit_completions').select('habit_id, completed_on').order('completed_on', { ascending: false }),
      supabase.from('habit_skips').select('habit_id, skipped_on'),
      supabase.auth.getSession().then(({ data }) => data.session?.user ?? null),
    ]);
    if (habitsResult.error?.message.includes('reminder_time')) {
      habitsResult = await supabase.from('habits').select('id, name, icon, color, frequency').order('created_at', { ascending: true });
    }
    if (goalsResult.error?.message.match(/notes|target|progress/)) {
      goalsResult = await supabase.from('goals').select('id, title').order('created_at', { ascending: true });
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
    if (failure) { setState((current) => ({ ...current, loading: false, error: toFriendlyError(failure.message) })); return; }
    const taskRows = (tasksResult.data ?? []) as TaskRow[];
    const habitRows = (habitsResult.data ?? []) as HabitRow[];
    const goalRows = (goalsResult.data ?? []) as GoalRow[];
    const completionRows = (completionsResult.data ?? []) as CompletionRow[];
    const today = todayKey();
    const sessionUser = profileResult as { id: string; email: string } | null;
    const profile = sessionUser ? await ensureProfile(sessionUser.id, sessionUser.email) : null;
    setState({
      tasks: taskRows.map((task) => ({ ...task, time: task.due_label ?? 'Anytime' })),
      habits: habitRows.map((habit) => {
        const history = completionRows.filter((item) => item.habit_id === habit.id).map((item) => item.completed_on);
        const skips = skipMap[habit.id] ?? [];
        return {
          ...habit,
          reminder_time: habit.reminder_time ?? null,
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
    });
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const toggleTask = useCallback(async (id: string, completed: boolean) => {
    const { error } = await supabase.from('tasks').update({ completed, completed_at: completed ? new Date().toISOString() : null }).eq('id', id);
    if (error) { setState((current) => ({ ...current, error: 'That task could not be updated. Please try again.' })); return; }
    setState((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, completed } : task) }));
  }, []);

  const toggleHabit = useCallback(async (id: string, completed: boolean) => {
    const today = todayKey();
    const habit = stateRef.current.habits.find((item) => item.id === id);
    const weekly = isWeeklyHabit(habit?.frequency ?? 'Daily');
    const weekKeys = weekDateKeys();
    const result = completed
      ? await supabase.from('habit_completions').upsert({ habit_id: id, completed_on: today }, { onConflict: 'user_id,habit_id,completed_on' })
      : weekly
        ? await supabase.from('habit_completions').delete().eq('habit_id', id).in('completed_on', weekKeys)
        : await supabase.from('habit_completions').delete().eq('habit_id', id).eq('completed_on', today);
    if (result.error) { setState((current) => ({ ...current, error: 'That habit could not be updated. Please try again.' })); return; }
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
  }, []);

  const createTask = useCallback(async (title: string, category = 'Personal', priority: Task['priority'] = 'Medium') => {
    const { data, error } = await supabase.from('tasks').insert({ title, category, priority, due_label: 'Anytime' }).select('id, title, category, priority, due_label, completed').maybeSingle();
    if (error || !data) throw new Error('Task could not be created.');
    const task = data as TaskRow;
    setState((current) => ({ ...current, tasks: [...current.tasks, { ...task, time: task.due_label ?? 'Anytime' }] }));
  }, []);

  const createGoal = useCallback(async (title: string, notes = '', target = 10, progress = 0) => {
    const safeTarget = Math.max(1, target);
    const payload = { title, notes, target: safeTarget, progress: Math.min(Math.max(0, progress), safeTarget) };
    let { data, error } = await supabase.from('goals').insert(payload).select('id, title, notes, target, progress').maybeSingle();
    if (error) {
      const fallback = await supabase.from('goals').insert({ title }).select('id, title').maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }
    if (error || !data) throw new Error('Goal could not be created.');
    setState((current) => ({ ...current, goals: [...current.goals, mapGoal(data as GoalRow)] }));
  }, []);

  const createHabit = useCallback(async (name: string) => {
    const { data, error } = await supabase.from('habits').insert({ name, icon: '✦', color: 'mint', frequency: 'Daily' }).select('id, name, icon, color, frequency, reminder_time').maybeSingle();
    if (error || !data) throw new Error('Habit could not be created.');
    const habit = data as HabitRow;
    setState((current) => ({ ...current, habits: [...current.habits, { ...habit, reminder_time: habit.reminder_time ?? null, completed: false, streak: 0, history: [], skips: [] }] }));
  }, []);

  const createHabitWithDetails = useCallback(async (name: string, icon: string, color: string, frequency: string) => {
    const { data, error } = await supabase.from('habits').insert({ name, icon, color, frequency }).select('id, name, icon, color, frequency, reminder_time').maybeSingle();
    if (error || !data) throw new Error('Habit could not be created.');
    const habit = data as HabitRow;
    setState((current) => ({ ...current, habits: [...current.habits, { ...habit, reminder_time: habit.reminder_time ?? null, completed: false, streak: 0, history: [], skips: [] }] }));
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Pick<Task, 'title' | 'category' | 'priority' | 'time'>>) => {
    const payload: { title?: string; category?: string; priority?: Task['priority']; due_label?: string } = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.time !== undefined) payload.due_label = updates.time;
    const { error } = await supabase.from('tasks').update(payload).eq('id', id);
    if (error) throw new Error('That task could not be updated. Please try again.');
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === id ? { ...task, ...updates } : task),
    }));
  }, []);

  const updateHabit = useCallback(async (id: string, updates: Partial<Pick<Habit, 'name' | 'icon' | 'color' | 'frequency' | 'reminder_time'>>) => {
    const payload: Partial<Pick<Habit, 'name' | 'icon' | 'color' | 'frequency' | 'reminder_time'>> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.icon !== undefined) payload.icon = updates.icon;
    if (updates.color !== undefined) payload.color = updates.color;
    if (updates.frequency !== undefined) payload.frequency = updates.frequency;
    if (updates.reminder_time !== undefined) payload.reminder_time = updates.reminder_time;
    const { error } = await supabase.from('habits').update(payload).eq('id', id);
    if (error) throw new Error('That habit could not be updated. Please try again.');
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
  }, []);

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
    if (error) throw new Error('That goal could not be updated. Please try again.');
    setState((current) => ({
      ...current,
      goals: current.goals.map((goal) => goal.id === id ? mapGoal({ ...goal, ...payload }) : goal),
    }));
  }, []);

  const checkInGoal = useCallback(async (id: string) => {
    const goal = stateRef.current.goals.find((item) => item.id === id);
    if (!goal || goal.progress >= goal.target) return;
    await updateGoal(id, { progress: goal.progress + 1 });
  }, [updateGoal]);

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) { setState((current) => ({ ...current, error: 'That task could not be deleted. Please try again.' })); return; }
    setState((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }));
  }, []);

  const deleteHabit = useCallback(async (id: string) => {
    const { error } = await supabase.from('habits').delete().eq('id', id);
    if (error) { setState((current) => ({ ...current, error: 'That habit could not be deleted. Please try again.' })); return; }
    setState((current) => ({ ...current, habits: current.habits.filter((habit) => habit.id !== id) }));
  }, []);

  const deleteGoal = useCallback(async (id: string) => {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) { setState((current) => ({ ...current, error: 'That goal could not be deleted. Please try again.' })); return; }
    setState((current) => ({ ...current, goals: current.goals.filter((goal) => goal.id !== id) }));
  }, []);

  const completeOnboarding = useCallback(async (name: string, selectedHabits: { name: string; icon: string; color: string; frequency: string }[]) => {
    if (!userId) return;
    const { error: profileError } = await supabase.from('profile_settings').update({ name, onboarded: true, updated_at: new Date().toISOString() }).eq('user_id', userId);
    if (profileError) throw new Error('Could not save your profile.');
    if (selectedHabits.length > 0) {
      const { error: habitsError } = await supabase.from('habits').insert(selectedHabits.map((h) => ({ name: h.name, icon: h.icon, color: h.color, frequency: h.frequency })));
      if (habitsError) throw new Error('Could not save your habits.');
    }
    setState((current) => ({ ...current, profile: current.profile ? { ...current.profile, name, onboarded: true } : current.profile, habits: [...current.habits, ...selectedHabits.map((h) => ({ id: crypto.randomUUID(), name: h.name, icon: h.icon, color: h.color, frequency: h.frequency, completed: false, streak: 0, history: [], skips: [], reminder_time: null }))] }));
  }, [userId]);

  const updateProfile = useCallback(async (updates: Partial<Pick<ProfileSettings, 'name' | 'theme' | 'notifications_enabled' | 'timezone'>>) => {
    if (!userId) return;
    const { error } = await supabase.from('profile_settings').update({ ...updates, updated_at: new Date().toISOString() }).eq('user_id', userId);
    if (error) { setState((current) => ({ ...current, error: 'Profile could not be updated. Please try again.' })); return; }
    setState((current) => ({ ...current, profile: current.profile ? { ...current.profile, ...updates } : current.profile }));
  }, [userId]);

  const markPreviousPeriod = useCallback(async (id: string) => {
    const habit = stateRef.current.habits.find((item) => item.id === id);
    if (!habit || !userId) return;
    const catchUp = catchUpFor(habit.frequency);
    const { error } = await supabase.from('habit_completions').upsert({ habit_id: id, completed_on: catchUp.completeOn }, { onConflict: 'user_id,habit_id,completed_on' });
    if (error) { setState((current) => ({ ...current, error: 'That day could not be updated. Please try again.' })); return; }
    const skipDelete = await supabase.from('habit_skips').delete().eq('habit_id', id).eq('skipped_on', catchUp.skipKey);
    const skips = habit.skips.filter((date) => date !== catchUp.skipKey);
    if (skipDelete.error) {
      const skipMap = readSkipMap(userId);
      skipMap[id] = skips;
      writeSkipMap(userId, skipMap);
    }
    setState((current) => ({
      ...current,
      habits: current.habits.map((item) => {
        if (item.id !== id) return item;
        const history = Array.from(new Set([catchUp.completeOn, ...item.history]));
        return { ...item, history, skips, streak: streakFromHistory(history, item.frequency, skips) };
      }),
      completions: [catchUp.completeOn, ...current.completions],
    }));
  }, [userId]);

  const skipPreviousPeriod = useCallback(async (id: string) => {
    const habit = stateRef.current.habits.find((item) => item.id === id);
    if (!habit || !userId) return;
    const catchUp = catchUpFor(habit.frequency);
    const { error } = await supabase.from('habit_skips').upsert({ habit_id: id, skipped_on: catchUp.skipKey }, { onConflict: 'user_id,habit_id,skipped_on' });
    const skips = Array.from(new Set([...habit.skips, catchUp.skipKey]));
    if (error) {
      const skipMap = readSkipMap(userId);
      skipMap[id] = skips;
      writeSkipMap(userId, skipMap);
    }
    setState((current) => ({
      ...current,
      habits: current.habits.map((item) => {
        if (item.id !== id) return item;
        return { ...item, skips, streak: streakFromHistory(item.history, item.frequency, skips) };
      }),
    }));
  }, [userId]);

  const undoSkipPreviousPeriod = useCallback(async (id: string) => {
    const habit = stateRef.current.habits.find((item) => item.id === id);
    if (!habit || !userId) return;
    const catchUp = catchUpFor(habit.frequency);
    const { error } = await supabase.from('habit_skips').delete().eq('habit_id', id).eq('skipped_on', catchUp.skipKey);
    const skips = habit.skips.filter((date) => date !== catchUp.skipKey);
    if (error) {
      const skipMap = readSkipMap(userId);
      skipMap[id] = skips;
      writeSkipMap(userId, skipMap);
    }
    setState((current) => ({
      ...current,
      habits: current.habits.map((item) => {
        if (item.id !== id) return item;
        return { ...item, skips, streak: streakFromHistory(item.history, item.frequency, skips) };
      }),
    }));
  }, [userId]);

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
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? 'Could not delete account. Please try again or contact support.');
    }
  }, []);

  return { ...state, reload: load, toggleTask, toggleHabit, markPreviousPeriod, skipPreviousPeriod, undoSkipPreviousPeriod, createTask, createHabit, createHabitWithDetails, createGoal, checkInGoal, updateTask, updateHabit, updateGoal, deleteTask, deleteHabit, deleteGoal, updateProfile, completeOnboarding, deleteAccount };
}
