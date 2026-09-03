import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { DataState, Goal, Habit, ProfileSettings, Task } from '@/types';

type TaskRow = { id: string; title: string; category: string; priority: Task['priority']; due_label: string | null; completed: boolean };
type HabitRow = { id: string; name: string; icon: string; color: Habit['color']; frequency: string };
type GoalRow = { id: string; title: string };
type CompletionRow = { habit_id: string; completed_on: string };

const initialState: DataState = { tasks: [], habits: [], goals: [], completions: [], profile: null, loading: true, error: null };

function calculateStreak(habitId: string, completions: CompletionRow[]): number {
  const dates = new Set(completions.filter((item) => item.habit_id === habitId).map((item) => item.completed_on));
  let streak = 0;
  const cursor = new Date();
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
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
    const today = new Date().toISOString().slice(0, 10);
    const sessionUser = profileResult as { id: string; email: string } | null;
    const profile = sessionUser ? await ensureProfile(sessionUser.id, sessionUser.email) : null;
    setState({
      tasks: taskRows.map((task) => ({ ...task, time: task.due_label ?? 'Anytime' })),
      habits: habitRows.map((habit) => ({ ...habit, completed: completionRows.some((item) => item.habit_id === habit.id && item.completed_on === today), streak: calculateStreak(habit.id, completionRows) })),
      goals: goalRows.map((goal) => ({ id: goal.id, title: goal.title })),
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
    const today = new Date().toISOString().slice(0, 10);
    const result = completed
      ? await supabase.from('habit_completions').upsert({ habit_id: id, completed_on: today }, { onConflict: 'user_id,habit_id,completed_on' })
      : await supabase.from('habit_completions').delete().eq('habit_id', id).eq('completed_on', today);
    if (result.error) { setState((current) => ({ ...current, error: 'That habit could not be updated. Please try again.' })); return; }
    setState((current) => ({ ...current, habits: current.habits.map((habit) => habit.id === id ? { ...habit, completed, streak: completed ? habit.streak + 1 : Math.max(0, habit.streak - 1) } : habit), completions: completed ? [today, ...current.completions] : current.completions.filter((date) => date !== today) }));
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
    setState((current) => ({ ...current, habits: [...current.habits, { ...habit, completed: false, streak: 0 }] }));
  }, []);

  const createHabitWithDetails = useCallback(async (name: string, icon: string, color: string, frequency: string) => {
    const { data, error } = await supabase.from('habits').insert({ name, icon, color, frequency }).select('id, name, icon, color, frequency').maybeSingle();
    if (error || !data) throw new Error('Habit could not be created.');
    const habit = data as HabitRow;
    setState((current) => ({ ...current, habits: [...current.habits, { ...habit, completed: false, streak: 0 }] }));
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

  const completeOnboarding = useCallback(async (name: string, selectedHabits: { name: string; icon: string; color: string; frequency: string }[]) => {
    if (!userId) return;
    const { error: profileError } = await supabase.from('profile_settings').update({ name, onboarded: true, updated_at: new Date().toISOString() }).eq('user_id', userId);
    if (profileError) throw new Error('Could not save your profile.');
    if (selectedHabits.length > 0) {
      const { error: habitsError } = await supabase.from('habits').insert(selectedHabits.map((h) => ({ name: h.name, icon: h.icon, color: h.color, frequency: h.frequency })));
      if (habitsError) throw new Error('Could not save your habits.');
    }
    setState((current) => ({ ...current, profile: current.profile ? { ...current.profile, name, onboarded: true } : current.profile, habits: [...current.habits, ...selectedHabits.map((h) => ({ id: crypto.randomUUID(), name: h.name, icon: h.icon, color: h.color, frequency: h.frequency, completed: false, streak: 0 }))] }));
  }, [userId]);

  const updateProfile = useCallback(async (updates: Partial<Pick<ProfileSettings, 'name' | 'theme' | 'notifications_enabled' | 'timezone'>>) => {
    if (!userId) return;
    const { error } = await supabase.from('profile_settings').update({ ...updates, updated_at: new Date().toISOString() }).eq('user_id', userId);
    if (error) { setState((current) => ({ ...current, error: 'Profile could not be updated. Please try again.' })); return; }
    setState((current) => ({ ...current, profile: current.profile ? { ...current.profile, ...updates } : current.profile }));
  }, [userId]);

  return { ...state, reload: load, toggleTask, toggleHabit, createTask, createHabit, createHabitWithDetails, createGoal, deleteTask, deleteHabit, deleteGoal, updateProfile, completeOnboarding };
}
