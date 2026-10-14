import type { Goal, Habit, ProfileSettings, Task } from '@/types';

export type WorkspaceSnapshot = {
  tasks: Task[];
  habits: Habit[];
  goals: Goal[];
  completions: string[];
  profile: ProfileSettings | null;
};

export type QueuedMutation =
  | { id: string; kind: 'task-toggle'; taskId: string; completed: boolean }
  | { id: string; kind: 'task-create'; task: Task }
  | { id: string; kind: 'task-update'; taskId: string; payload: { title?: string; category?: string; priority?: Task['priority']; due_label?: string; due_date?: string | null } }
  | { id: string; kind: 'task-delete'; taskId: string }
  | { id: string; kind: 'habit-toggle'; habitId: string; completed: boolean; today: string; weekly: boolean; weekKeys: string[] }
  | { id: string; kind: 'habit-create'; habit: { id: string; name: string; icon: string; color: string; frequency: string; reminder_time: string | null; created_at: string } }
  | { id: string; kind: 'habit-update'; habitId: string; payload: Partial<Pick<Habit, 'name' | 'icon' | 'color' | 'frequency' | 'reminder_time'>> }
  | { id: string; kind: 'habit-delete'; habitId: string }
  | { id: string; kind: 'habit-complete-day'; habitId: string; date: string }
  | { id: string; kind: 'habit-unskip'; habitId: string; skipKey: string }
  | { id: string; kind: 'habit-skip'; habitId: string; skipKey: string }
  | { id: string; kind: 'goal-create'; goal: Goal }
  | { id: string; kind: 'goal-update'; goalId: string; payload: Partial<Pick<Goal, 'title' | 'notes' | 'target' | 'progress'>> }
  | { id: string; kind: 'goal-delete'; goalId: string }
  | { id: string; kind: 'profile-update'; payload: Partial<Pick<ProfileSettings, 'name' | 'theme' | 'notifications_enabled' | 'timezone' | 'onboarded'>> };

export type QueuedMutationInput = QueuedMutation extends infer Item
  ? Item extends { id: string }
    ? Omit<Item, 'id'>
    : never
  : never;

function snapshotKey(userId: string): string {
  return `daymark-offline-data:${userId}`;
}

function queueKey(userId: string): string {
  return `daymark-offline-queue:${userId}`;
}

export function readSnapshot(userId: string): WorkspaceSnapshot | null {
  try {
    const raw = localStorage.getItem(snapshotKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as WorkspaceSnapshot;
  } catch {
    return null;
  }
}

export function writeSnapshot(userId: string, snapshot: WorkspaceSnapshot): void {
  localStorage.setItem(snapshotKey(userId), JSON.stringify(snapshot));
}

export function clearOfflineData(userId: string): void {
  localStorage.removeItem(snapshotKey(userId));
  localStorage.removeItem(queueKey(userId));
}

export function readQueue(userId: string): QueuedMutation[] {
  try {
    return JSON.parse(localStorage.getItem(queueKey(userId)) ?? '[]') as QueuedMutation[];
  } catch {
    return [];
  }
}

export function writeQueue(userId: string, queue: QueuedMutation[]): void {
  if (queue.length === 0) {
    localStorage.removeItem(queueKey(userId));
    return;
  }
  localStorage.setItem(queueKey(userId), JSON.stringify(queue));
}

export function enqueueMutation(userId: string, mutation: QueuedMutationInput): void {
  const queue = readQueue(userId);
  queue.push({ ...mutation, id: crypto.randomUUID() } as QueuedMutation);
  writeQueue(userId, queue);
}

export function isNetworkFailure(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error ?? '');
  return /failed to fetch|networkerror|network request failed|load failed|offline|fetch/i.test(message);
}
