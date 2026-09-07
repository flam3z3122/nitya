import { useEffect } from 'react';
import type { Habit } from '@/types';
import { normalizeTimeKey, nowTimeKey, todayKey } from '@/lib/activity';

const FIRED_KEY = 'daymark-reminders-fired';

type FiredMap = Record<string, string>;

function readFired(): FiredMap {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) ?? '{}') as FiredMap;
  } catch {
    return {};
  }
}

function writeFired(map: FiredMap) {
  localStorage.setItem(FIRED_KEY, JSON.stringify(map));
}

export async function requestReminderPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

async function showReminder(habit: Habit) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const title = `Time for ${habit.name}`;
  const options: NotificationOptions = {
    body: 'A small step keeps your streak going.',
    icon: '/icons/icon-192.png',
    tag: `habit-${habit.id}`,
    data: { habitId: habit.id },
  };
  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    await registration.showNotification(title, options);
    return;
  }
  new Notification(title, options);
}

export function useReminders(habits: Habit[], enabled: boolean) {
  useEffect(() => {
    if (!enabled || !habits.length) return;

    const tick = () => {
      const today = todayKey();
      const now = nowTimeKey();
      const fired = readFired();
      let changed = false;

      for (const habit of habits) {
        if (!habit.reminder_time || habit.completed) continue;
        if (normalizeTimeKey(habit.reminder_time) > now) continue;
        if (fired[habit.id] === today) continue;
        fired[habit.id] = today;
        changed = true;
        void showReminder(habit);
      }

      if (changed) writeFired(fired);
    };

    tick();
    const timer = window.setInterval(tick, 20000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [habits, enabled]);
}
