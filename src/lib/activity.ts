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

export function isWeeklyHabit(frequency: string): boolean {
  return frequency.trim().toLowerCase() === 'weekly';
}

export function startOfWeek(date: Date = new Date()): Date {
  const cursor = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = cursor.getDay() === 0 ? 6 : cursor.getDay() - 1;
  cursor.setDate(cursor.getDate() - offset);
  return cursor;
}

export function weekDateKeys(date: Date = new Date()): string[] {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return localDateKey(day);
  });
}

export function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function weekContains(history: string[], date: Date = new Date()): boolean {
  const keys = new Set(weekDateKeys(date));
  return history.some((day) => keys.has(day));
}

export function isHabitCompleteOn(habit: Pick<Habit, 'frequency' | 'history'>, key: string): boolean {
  if (isWeeklyHabit(habit.frequency)) return weekContains(habit.history, dateFromKey(key));
  return habit.history.includes(key);
}

export function completedHabitsOn(habits: Habit[], key: string): Habit[] {
  return habits.filter((habit) => habit.history.includes(key));
}

export function dayCompletionRate(habits: Habit[], key: string): number {
  if (!habits.length) return 0;
  const done = habits.filter((habit) => isHabitCompleteOn(habit, key)).length;
  return Math.round((done / habits.length) * 100);
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const next = new Date(year, month + delta, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

export function yesterdayKey(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return localDateKey(date);
}

export type CatchUp = {
  label: 'yesterday' | 'last week';
  completeOn: string;
  skipKey: string;
};

export function catchUpFor(frequency: string): CatchUp {
  if (isWeeklyHabit(frequency)) {
    const lastMonday = startOfWeek(new Date());
    lastMonday.setDate(lastMonday.getDate() - 7);
    const keys = weekDateKeys(lastMonday);
    return { label: 'last week', completeOn: keys[6], skipKey: keys[0] };
  }
  const yesterday = yesterdayKey();
  return { label: 'yesterday', completeOn: yesterday, skipKey: yesterday };
}

export function previousPeriodDone(habit: Pick<Habit, 'frequency' | 'history'>): boolean {
  const catchUp = catchUpFor(habit.frequency);
  if (isWeeklyHabit(habit.frequency)) return weekContains(habit.history, dateFromKey(catchUp.skipKey));
  return habit.history.includes(catchUp.completeOn);
}

export function previousPeriodSkipped(skips: string[], frequency: string): boolean {
  return skips.includes(catchUpFor(frequency).skipKey);
}

function weeklyStreakFromHistory(dates: string[], skips: string[]): number {
  const set = new Set(dates);
  const skipSet = new Set(skips);
  const weekDone = (cursor: Date) => weekDateKeys(cursor).some((key) => set.has(key));
  const weekSkipped = (cursor: Date) => skipSet.has(localDateKey(startOfWeek(cursor)));
  const accounted = (cursor: Date) => weekDone(cursor) || weekSkipped(cursor);
  const cursor = startOfWeek(new Date());
  if (!accounted(cursor)) {
    cursor.setDate(cursor.getDate() - 7);
    if (!accounted(cursor)) return 0;
  }
  let streak = 0;
  while (accounted(cursor)) {
    if (weekDone(cursor)) streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

export function streakFromHistory(dates: string[], frequency = 'Daily', skips: string[] = []): number {
  if (isWeeklyHabit(frequency)) return weeklyStreakFromHistory(dates, skips);
  const set = new Set(dates);
  const skipSet = new Set(skips);
  const counted = (key: string) => set.has(key) || skipSet.has(key);
  const cursor = new Date();
  if (!counted(localDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!counted(localDateKey(cursor))) return 0;
  }
  let streak = 0;
  while (counted(localDateKey(cursor))) {
    if (set.has(localDateKey(cursor))) streak += 1;
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
