import type { Habit } from '@/types';

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayKey(): string {
  return localDateKey(new Date());
}

export function dateKey(year: number, month: number, day: number): string {
  return localDateKey(new Date(year, month, day));
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function mondayOffset(year: number, month: number): number {
  const weekday = new Date(year, month, 1).getDay();
  return weekday === 0 ? 6 : weekday - 1;
}

export function completedHabitsOn(habits: Habit[], key: string): Habit[] {
  return habits.filter((habit) => habit.history.includes(key));
}

export function dayCompletionRate(habits: Habit[], key: string): number {
  if (!habits.length) return 0;
  return Math.round((completedHabitsOn(habits, key).length / habits.length) * 100);
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const next = new Date(year, month + delta, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

export function streakFromHistory(dates: string[]): number {
  const set = new Set(dates);
  const cursor = new Date();
  if (!set.has(localDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(localDateKey(cursor))) return 0;
  }
  let streak = 0;
  while (set.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function normalizeTimeKey(value: string): string {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
}

export function nowTimeKey(): string {
  return normalizeTimeKey(
    `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`
  );
}

export function formatReminderTime(value: string): string {
  const [hours, minutes] = normalizeTimeKey(value).split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

export function currentWeekDays(): { label: string; key: string }[] {
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const now = new Date();
  const offset = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - offset);
  return labels.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { label, key: localDateKey(date) };
  });
}
