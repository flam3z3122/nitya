import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Cron-Secret',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isAuthorized(req: Request): boolean {
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  const headerSecret = req.headers.get('X-Cron-Secret') ?? '';
  if (cronSecret && headerSecret === cronSecret) return true;
  const auth = req.headers.get('Authorization') ?? '';
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return Boolean(serviceKey && auth === `Bearer ${serviceKey}`);
}

function normalizeTime(value: string): string {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
}

function addDays(key: string, amount: number): string {
  const [year, month, day] = key.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + amount));
  return next.toISOString().slice(0, 10);
}

function startOfWeekKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const offset = weekday === 0 ? 6 : weekday - 1;
  return addDays(key, -offset);
}

function weekKeys(key: string): string[] {
  const monday = startOfWeekKey(key);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

function localStamp(timeZone: string, date = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

type HabitRow = { id: string; user_id: string; name: string; frequency: string; reminder_time: string };
type CompletionRow = { habit_id: string; completed_on: string };
type SubRow = { user_id: string; endpoint: string; p256dh: string; auth: string; timezone: string };

export default async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }
  if (!isAuthorized(req)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@todayshabit.netlify.app';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!vapidPublic || !vapidPrivate || !supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Push reminders are not configured.' }, 500);
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const [profileResult, habitResult, subResult] = await Promise.all([
    admin.from('profile_settings').select('user_id, notifications_enabled'),
    admin.from('habits').select('id, user_id, name, frequency, reminder_time').not('reminder_time', 'is', null),
    admin.from('push_subscriptions').select('user_id, endpoint, p256dh, auth, timezone'),
  ]);
  const profiles = (profileResult.data ?? []) as Array<{ user_id: string; notifications_enabled: boolean | null }>;
  const habits = (habitResult.data ?? []) as HabitRow[];
  const subs = (subResult.data ?? []) as SubRow[];

  const enabled = new Set(
    profiles
      .filter((row) => row.notifications_enabled !== false)
      .map((row) => row.user_id),
  );

  const dueHabits = habits.filter((habit) => enabled.has(habit.user_id) && habit.reminder_time);
  if (dueHabits.length === 0 || subs.length === 0) {
    return json({ ok: true, sent: 0 });
  }

  const oldest = addDays(new Date().toISOString().slice(0, 10), -8);
  const [completionResult, skipResult] = await Promise.all([
    admin.from('habit_completions').select('habit_id, completed_on').gte('completed_on', oldest),
    admin.from('habit_skips').select('habit_id, skipped_on').gte('skipped_on', oldest),
  ]);
  const completions = (completionResult.data ?? []) as CompletionRow[];
  const skips = (skipResult.data ?? []) as Array<{ habit_id: string; skipped_on: string }>;

  const doneByHabit = new Map<string, string[]>();
  for (const row of completions) {
    const key = String(row.completed_on).slice(0, 10);
    const list = doneByHabit.get(row.habit_id) ?? [];
    list.push(key);
    doneByHabit.set(row.habit_id, list);
  }
  const skippedByHabit = new Map<string, string[]>();
  for (const row of skips) {
    const key = String(row.skipped_on).slice(0, 10);
    const list = skippedByHabit.get(row.habit_id) ?? [];
    list.push(key);
    skippedByHabit.set(row.habit_id, list);
  }

  const alreadyResult = await admin
    .from('reminder_sends')
    .select('habit_id, sent_on')
    .gte('sent_on', oldest);
  const sentSet = new Set(
    ((alreadyResult.data ?? []) as { habit_id: string; sent_on: string }[]).map((row) => `${row.habit_id}:${String(row.sent_on).slice(0, 10)}`),
  );

  const subsByUser = new Map<string, SubRow[]>();
  for (const sub of subs) {
    if (!enabled.has(sub.user_id)) continue;
    const list = subsByUser.get(sub.user_id) ?? [];
    list.push(sub);
    subsByUser.set(sub.user_id, list);
  }

  let sent = 0;
  const goneEndpoints: string[] = [];

  for (const habit of dueHabits) {
    const devices = subsByUser.get(habit.user_id) ?? [];
    if (devices.length === 0) continue;
    const tz = devices[0]?.timezone || 'UTC';
    const stamp = localStamp(tz);
    if (normalizeTime(habit.reminder_time) > stamp.time) continue;

    const history = doneByHabit.get(habit.id) ?? [];
    const weekly = habit.frequency.trim().toLowerCase() === 'weekly';
    const done = weekly
      ? weekKeys(stamp.date).some((key) => history.includes(key))
      : history.includes(stamp.date);
    if (done) continue;
    const skipHistory = skippedByHabit.get(habit.id) ?? [];
    const skipped = weekly
      ? skipHistory.includes(weekKeys(stamp.date)[0])
      : skipHistory.includes(stamp.date);
    if (skipped) continue;
    if (sentSet.has(`${habit.id}:${stamp.date}`)) continue;

    const payload = JSON.stringify({
      title: `Time for ${habit.name}`,
      body: 'A small step keeps your streak going.',
      tag: `habit-${habit.id}`,
      data: { habitId: habit.id },
    });

    let delivered = false;
    for (const device of devices) {
      try {
        await webpush.sendNotification(
          { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
          payload,
        );
        delivered = true;
      } catch (error) {
        const status = typeof error === 'object' && error && 'statusCode' in error
          ? Number((error as { statusCode: number }).statusCode)
          : 0;
        if (status === 404 || status === 410) goneEndpoints.push(device.endpoint);
      }
    }

    if (delivered) {
      sent += 1;
      sentSet.add(`${habit.id}:${stamp.date}`);
      await admin.from('reminder_sends').upsert({
        habit_id: habit.id,
        sent_on: stamp.date,
        user_id: habit.user_id,
      });
    }
  }

  if (goneEndpoints.length > 0) {
    await admin.from('push_subscriptions').delete().in('endpoint', goneEndpoints);
  }

  return json({ ok: true, sent });
};
