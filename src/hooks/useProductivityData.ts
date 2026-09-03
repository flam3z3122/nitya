import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { DataState, Goal, Habit, ProfileSettings, Task } from '@/types';

type TaskRow = { id: string; title: string; category: string; priority: Task['priority']; due_label: string | null; completed: boolean };
type HabitRow = { id: string; name: string; icon: string; color: Habit['color']; frequency: string };
type GoalRow = { id: string; title: string };
type CompletionRow = { habit_id: string; completed_on: string };

const initialState: DataState = { tasks: [], habits: [], goals: [], completionRows: [], completions: [], profile: null, loading: true, error: null };

function calculateStreak(habitId: string, completions: CompletionRow[]): number {
  const dates = completions.filter((item) => item.habit_id === habitId).map((item) => item.completed_on);
  if (dates.length === 0) return 0;
  const dateSet = new Set(dates);
  // Start from today if completed today, otherwise start from the most recent completion
  const today = new Date().toISOString().slice(0, 10);
  let cursorDate = dateSet.has(today) ? today : dates.slice().sort().pop() as string;
  let streak = 0;
  // walk backwards counting consecutive days
  while (dateSet.has(cursorDate)) {
    streak += 1;
    const d = new Date(cursorDate);
    d.setDate(d.getDate() - 1);
    cursorDate = d.toISOString().slice(0, 10);
  }
  return streak;
}

function toFriendlyError(message: string): string {
  return `We couldn't load your workspace. ${message}`;
}

async function ensureProfile(userId: string, email: string): Promise<ProfileSettings | null> {
  const { data: existing } = await supabase.from('profile_settings').select('name, email, theme, onboarded').eq('user_id', userId).maybeSingle();
  if (existing) return existing as ProfileSettings;
  const { data: created, error } = await supabase.from('profile_settings').insert({ user_id: userId, email }).select('name, email, theme, onboarded').maybeSingle();
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

  const load = useCallback(async () => {
    if (!userId) { setState({ ...initialState, loading: false }); return; }
    setState((current) => ({ ...current, loading: true, error: null }));
    await ensureWelcomeTask();
    const [tasksResult, habitsResult, goalsResult, completionsResult, profileResult] = await Promise.all([
      supabase.from('tasks').select('id, title, category, priority, due_label, completed').order('created_at', { ascending: true }),
      supabase.from('habits').select('id, name, icon, color, frequency').order('created_at', { ascending: true }),
      supabase.from('goals').select('id, title').order('created_at', { ascending: true }),
      supabase.from('habit_completions').select('habit_id, completed_on').order('completed_on', { ascending: false }),
      supabase.auth.getSession().then(({ data }) => data.session?.user ?? null),
    ]);
    const failure = tasksResult.error ?? habitsResult.error ?? goalsResult.error ?? completionsResult.error;
    if (failure) { setState((current) => ({ ...current, loading: false, error: toFriendlyError(failure.message) })); return; }
    const taskRows = (tasksResult.data ?? []) as TaskRow[];
    const habitRows = (habitsResult.data ?? []) as HabitRow[];
    const goalRows = (goalsResult.data ?? []) as GoalRow[];
    const completionRows = (completionsResult.data ?? []) as CompletionRow[];
    // Normalize timestamps to YYYY-MM-DD to avoid mismatches between full ISO strings and date-only strings
    const normalizedCompletionRows = completionRows.map((c) => ({ habit_id: c.habit_id, completed_on: c.completed_on.slice(0, 10) }));
    const today = new Date().toISOString().slice(0, 10);
    const sessionUser = profileResult as { id: string; email: string } | null;
    const profile = sessionUser ? await ensureProfile(sessionUser.id, sessionUser.email) : null;
    setState({
      tasks: taskRows.map((task) => ({ ...task, time: task.due_label ?? 'Anytime' })),
      habits: habitRows.map((habit) => ({
        ...habit,
        completed: normalizedCompletionRows.some((item) => item.habit_id === habit.id && item.completed_on === today),
        streak: calculateStreak(habit.id, normalizedCompletionRows),
        history: normalizedCompletionRows.filter((c) => c.habit_id === habit.id).map((c) => c.completed_on),
      })),
      goals: goalRows.map((goal) => ({ id: goal.id, title: goal.title })),
      completionRows: normalizedCompletionRows,
      completions: Array.from(new Set(normalizedCompletionRows.map((item) => item.completed_on))),
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
    const today = new Date().toISOString().slice(0, 10);
    const result = completed
      ? await supabase.from('habit_completions').upsert({ habit_id: id, completed_on: today }, { onConflict: 'user_id,habit_id,completed_on' })
      : await supabase.from('habit_completions').delete().eq('habit_id', id).eq('completed_on', today);
    if (result.error) { setState((current) => ({ ...current, error: 'That habit could not be updated. Please try again.' })); return; }
    setState((current) => {
      // ensure completed_on values are normalized and deduplicated
      const filtered = current.completionRows.filter((c) => !(c.habit_id === id && c.completed_on === today));
      const newCompletionRows = completed ? [{ habit_id: id, completed_on: today }, ...filtered] : filtered;
      const newHabits = current.habits.map((habit) => habit.id === id ? { ...habit, completed, streak: calculateStreak(habit.id, newCompletionRows), history: newCompletionRows.filter((c) => c.habit_id === habit.id).map((c) => c.completed_on) } : habit);
      return { ...current, habits: newHabits, completionRows: newCompletionRows, completions: Array.from(new Set(newCompletionRows.map((c) => c.completed_on))) };
    });
  }, []);

  const createTask = useCallback(async (title: string) => {
    const { data, error } = await supabase.from('tasks').insert({ title, category: 'Personal', priority: 'Medium', due_label: 'Anytime' }).select('id, title, category, priority, due_label, completed').maybeSingle();
    if (error || !data) throw new Error('Task could not be created.');
    const task = data as TaskRow;
    setState((current) => ({ ...current, tasks: [...current.tasks, { ...task, time: task.due_label ?? 'Anytime' }] }));
  }, []);

  const createGoal = useCallback(async (title: string) => {
    const { data, error } = await supabase.from('goals').insert({ title }).select('id, title').maybeSingle();
    if (error || !data) throw new Error('Goal could not be created.');
    const goal = data as GoalRow;
    setState((current) => ({ ...current, goals: [...current.goals, { id: goal.id, title: goal.title }] }));
  }, []);

  const createHabit = useCallback(async (name: string) => {
    const { data, error } = await supabase.from('habits').insert({ name, icon: '✦', color: 'mint', frequency: 'Daily' }).select('id, name, icon, color, frequency').maybeSingle();
    if (error || !data) throw new Error('Habit could not be created.');
    const habit = data as HabitRow;
    setState((current) => ({ ...current, habits: [...current.habits, { ...habit, completed: false, streak: 0, history: [] }] }));
  }, []);

  const createHabitWithDetails = useCallback(async (name: string, icon: string, color: string, frequency: string) => {
    const { data, error } = await supabase.from('habits').insert({ name, icon, color, frequency }).select('id, name, icon, color, frequency').maybeSingle();
    if (error || !data) throw new Error('Habit could not be created.');
    const habit = data as HabitRow;
    setState((current) => ({ ...current, habits: [...current.habits, { ...habit, completed: false, streak: 0, history: [] }] }));
  }, []);

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

  const updateTask = useCallback(async (id: string, updates: Partial<{ title: string; category: string; priority: Task['priority']; due_label: string | null }>) => {
    const { data, error } = await supabase.from('tasks').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select('id, title, category, priority, due_label, completed').maybeSingle();
    if (error || !data) { setState((current) => ({ ...current, error: 'Task could not be updated. Please try again.' })); return; }
    const taskRow = data as TaskRow;
    setState((current) => ({ ...current, tasks: current.tasks.map((t) => t.id === id ? { ...taskRow, time: taskRow.due_label ?? 'Anytime' } : t) }));
  }, []);

  const updateHabit = useCallback(async (id: string, updates: Partial<{ name: string; icon: string; color: Habit['color']; frequency: string }>) => {
    const { data, error } = await supabase.from('habits').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select('id, name, icon, color, frequency').maybeSingle();
    if (error || !data) { setState((current) => ({ ...current, error: 'Habit could not be updated. Please try again.' })); return; }
    const habitRow = data as HabitRow;
    setState((current) => ({ ...current, habits: current.habits.map((h) => h.id === id ? { ...h, name: habitRow.name, icon: habitRow.icon, color: habitRow.color, frequency: habitRow.frequency } : h) }));
  }, []);

  const updateGoal = useCallback(async (id: string, updates: Partial<{ title: string }>) => {
    const { data, error } = await supabase.from('goals').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select('id, title').maybeSingle();
    if (error || !data) { setState((current) => ({ ...current, error: 'Goal could not be updated. Please try again.' })); return; }
    const goalRow = data as GoalRow;
    setState((current) => ({ ...current, goals: current.goals.map((g) => g.id === id ? { id: goalRow.id, title: goalRow.title } : g) }));
  }, []);

  const completeOnboarding = useCallback(async (name: string, selectedHabits: { name: string; icon: string; color: string; frequency: string }[]) => {
    if (!userId) return;
    const { error: profileError } = await supabase.from('profile_settings').update({ name, onboarded: true, updated_at: new Date().toISOString() }).eq('user_id', userId);
    if (profileError) throw new Error('Could not save your profile.');
    if (selectedHabits.length > 0) {
      const { error: habitsError } = await supabase.from('habits').insert(selectedHabits.map((h) => ({ name: h.name, icon: h.icon, color: h.color, frequency: h.frequency })));
      if (habitsError) throw new Error('Could not save your habits.');
    }
    setState((current) => ({ ...current, profile: current.profile ? { ...current.profile, name, onboarded: true } : current.profile, habits: [...current.habits, ...selectedHabits.map((h) => ({ id: crypto.randomUUID(), name: h.name, icon: h.icon, color: h.color, frequency: h.frequency, completed: false, streak: 0, history: [] }))] }));
  }, [userId]);
 

    const updateProfile = useCallback(async (updates: Partial<Pick<ProfileSettings, 'name' | 'theme'>>) => {
    if (!userId) return;
    const { error } = await supabase.from('profile_settings').update({ ...updates, updated_at: new Date().toISOString() }).eq('user_id', userId);
    if (error) { setState((current) => ({ ...current, error: 'Profile could not be updated. Please try again.' })); return; }
    setState((current) => ({ ...current, profile: current.profile ? { ...current.profile, ...updates } : current.profile }));
  }, [userId]);

  return { ...state, reload: load, toggleTask, toggleHabit, createTask, createHabit, createHabitWithDetails, createGoal, deleteTask, deleteHabit, deleteGoal, updateTask, updateHabit, updateGoal, updateProfile, completeOnboarding };
}
