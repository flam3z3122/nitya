import { supabase } from '@/lib/supabase';
import { isNetworkFailure, type QueuedMutation } from '@/lib/offlineStore';

export type QueueFlushResult = {
  remaining: QueuedMutation[];
  failure: 'network' | 'permanent' | null;
};

function isBenignConflict(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '23505' || /duplicate|already exists/i.test(error.message ?? '');
}

export async function applyQueuedMutation(op: QueuedMutation): Promise<void> {
  switch (op.kind) {
    case 'task-toggle': {
      const { error } = await supabase.from('tasks').update({
        completed: op.completed,
        completed_at: op.completed ? op.completedAt ?? new Date().toISOString() : null,
      }).eq('id', op.taskId);
      if (error) throw error;
      return;
    }
    case 'task-create': {
      const { error } = await supabase.from('tasks').insert({
        id: op.task.id,
        title: op.task.title,
        category: op.task.category,
        priority: op.task.priority,
        due_label: op.task.time,
        due_date: op.task.dueDate ?? null,
        completed: op.task.completed,
        completed_at: op.task.completedAt ?? null,
      });
      if (error && !isBenignConflict(error)) throw error;
      return;
    }
    case 'task-update': {
      const { error } = await supabase.from('tasks').update(op.payload).eq('id', op.taskId);
      if (error) throw error;
      return;
    }
    case 'task-delete': {
      const { error } = await supabase.from('tasks').delete().eq('id', op.taskId);
      if (error) throw error;
      return;
    }
    case 'habit-toggle': {
      const result = op.completed
        ? await supabase.from('habit_completions').upsert({ habit_id: op.habitId, completed_on: op.today }, { onConflict: 'user_id,habit_id,completed_on' })
        : op.weekly
          ? await supabase.from('habit_completions').delete().eq('habit_id', op.habitId).in('completed_on', op.weekKeys)
          : await supabase.from('habit_completions').delete().eq('habit_id', op.habitId).eq('completed_on', op.today);
      if (result.error) throw result.error;
      return;
    }
    case 'habit-create': {
      const { error } = await supabase.from('habits').insert({
        id: op.habit.id,
        name: op.habit.name,
        icon: op.habit.icon,
        color: op.habit.color,
        frequency: op.habit.frequency,
        reminder_time: op.habit.reminder_time,
      });
      if (error && !isBenignConflict(error)) throw error;
      return;
    }
    case 'habit-update': {
      const { error } = await supabase.from('habits').update(op.payload).eq('id', op.habitId);
      if (error) throw error;
      return;
    }
    case 'habit-delete': {
      const { error } = await supabase.from('habits').delete().eq('id', op.habitId);
      if (error) throw error;
      return;
    }
    case 'habit-complete-day': {
      const { error } = await supabase.from('habit_completions').upsert(
        { habit_id: op.habitId, completed_on: op.date },
        { onConflict: 'user_id,habit_id,completed_on' },
      );
      if (error) throw error;
      return;
    }
    case 'habit-skip': {
      const { error } = await supabase.from('habit_skips').upsert(
        { habit_id: op.habitId, skipped_on: op.skipKey },
        { onConflict: 'user_id,habit_id,skipped_on' },
      );
      if (error) throw error;
      return;
    }
    case 'habit-unskip': {
      const { error } = await supabase.from('habit_skips').delete().eq('habit_id', op.habitId).eq('skipped_on', op.skipKey);
      if (error) throw error;
      return;
    }
    case 'goal-create': {
      const { error } = await supabase.from('goals').insert({
        id: op.goal.id,
        title: op.goal.title,
        notes: op.goal.notes,
        target: op.goal.target,
        progress: op.goal.progress,
      });
      if (error && !isBenignConflict(error)) throw error;
      return;
    }
    case 'goal-update': {
      const { error } = await supabase.from('goals').update(op.payload).eq('id', op.goalId);
      if (error) throw error;
      return;
    }
    case 'goal-delete': {
      const { error } = await supabase.from('goals').delete().eq('id', op.goalId);
      if (error) throw error;
      return;
    }
    case 'profile-update': {
      const { error } = await supabase.from('profile_settings').update({
        ...op.payload,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    }
  }
}

export async function flushMutationQueue(ops: QueuedMutation[]): Promise<QueueFlushResult> {
  for (let index = 0; index < ops.length; index += 1) {
    try {
      await applyQueuedMutation(ops[index]);
    } catch (error) {
      return {
        remaining: ops.slice(index),
        failure: isNetworkFailure(error) ? 'network' : 'permanent',
      };
    }
  }
  return { remaining: [], failure: null };
}
