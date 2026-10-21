import { LocalNotifications } from '@capacitor/local-notifications';
import type { PermissionState } from '@capacitor/core';
import { isAndroid } from '@/lib/capacitor';

const DAILY_REMINDER_ID = 5200815;
const DAILY_REMINDER_CHANNEL = 'daily-check-in';
const REMINDER_OPT_IN_KEY = 'daymark-native-reminder-enabled';
const STARTUP_PERMISSION_REQUESTED_KEY = 'daymark-native-reminder-startup-requested';

export function hasRequestedNativeReminderPermissionAtStartup(): boolean {
  return localStorage.getItem(STARTUP_PERMISSION_REQUESTED_KEY) === 'true';
}

export function markNativeReminderPermissionRequestedAtStartup(): void {
  localStorage.setItem(STARTUP_PERMISSION_REQUESTED_KEY, 'true');
}

export function readNativeReminderOptIn(userId: string): boolean {
  return localStorage.getItem(`${REMINDER_OPT_IN_KEY}:${userId}`) === 'true';
}

export function writeNativeReminderOptIn(userId: string, enabled: boolean): void {
  if (enabled) localStorage.setItem(`${REMINDER_OPT_IN_KEY}:${userId}`, 'true');
  else localStorage.removeItem(`${REMINDER_OPT_IN_KEY}:${userId}`);
}

export async function checkNativeReminderPermission(): Promise<PermissionState> {
  if (!isAndroid()) return 'denied';
  const { display } = await LocalNotifications.checkPermissions();
  return display;
}

export async function requestNativeReminderPermission(): Promise<boolean> {
  if (!isAndroid()) return false;
  const permission = await checkNativeReminderPermission();
  if (permission === 'granted') return true;
  const result = await LocalNotifications.requestPermissions();
  return result.display === 'granted';
}

export async function scheduleNativeDailyReminder(): Promise<void> {
  if (!isAndroid()) return;
  const permission = await checkNativeReminderPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission is not granted.');
  }

  await LocalNotifications.createChannel({
    id: DAILY_REMINDER_CHANNEL,
    name: 'Daily check-in',
    description: 'A gentle daily reminder to check your habits and tasks.',
    importance: 3,
  });

  const pending = await LocalNotifications.getPending();
  if (pending.notifications.some((notification) => notification.id === DAILY_REMINDER_ID)) return;

  await LocalNotifications.schedule({
    notifications: [{
      id: DAILY_REMINDER_ID,
      title: 'Your daily check-in',
      body: 'Take a moment to review your habits and tasks, or add something new.',
      channelId: DAILY_REMINDER_CHANNEL,
      schedule: {
        on: { hour: 20, minute: 0 },
        allowWhileIdle: true,
      },
      isExactNotification: false,
    }],
  });
}

export async function cancelNativeDailyReminder(): Promise<void> {
  if (!isAndroid()) return;
  await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] });
}
