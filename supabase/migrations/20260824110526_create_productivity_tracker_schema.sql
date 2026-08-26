/*
# Create the productivity tracker data model

1. New Tables
- `tasks`: one-time daily tasks with title, category, priority, due label, and completion state.
- `habits`: recurring routines with visual metadata and frequency.
- `habit_completions`: one completion record per habit and calendar day for history and streaks.
- `goals`: lightweight goals created from the quick-add flow.
- `profile_settings`: the shared workspace profile and preference values used by the profile screen.

2. Security
- Row level security is enabled on every new table.
- This Stage 1 app has no sign-in screen, so the workspace is intentionally single-tenant. Explicit CRUD policies allow the anon and authenticated application roles to operate on the shared workspace.

3. Seed Data
- Adds the four tasks, four habits, several habit completion records, and one profile row shown by the current UI.
- Inserts are conflict-safe so this migration can be safely re-run.

4. Important Notes
- No authentication or fake account system is added in this stage.
- Habit streaks are derived from completion history rather than stored as user-editable counters.
*/

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  category text NOT NULL DEFAULT 'Personal' CHECK (char_length(category) BETWEEN 1 AND 40),
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  due_label text,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  icon text NOT NULL DEFAULT '✦',
  color text NOT NULL DEFAULT 'mint' CHECK (color IN ('mint', 'peach', 'blue', 'lavender')),
  frequency text NOT NULL DEFAULT 'Daily' CHECK (char_length(frequency) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.habit_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  completed_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, completed_on)
);

CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profile_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  name text NOT NULL DEFAULT 'Alex Kim',
  email text NOT NULL DEFAULT 'alex.kim@example.com',
  theme text NOT NULL DEFAULT 'Light' CHECK (theme IN ('Light', 'Dark', 'System')),
  notifications_enabled boolean NOT NULL DEFAULT true,
  timezone text NOT NULL DEFAULT 'Pacific Time',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS habit_completions_habit_date_idx ON public.habit_completions (habit_id, completed_on DESC);
CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON public.tasks (created_at DESC);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shared_select_tasks" ON public.tasks;
CREATE POLICY "shared_select_tasks" ON public.tasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_tasks" ON public.tasks;
CREATE POLICY "shared_insert_tasks" ON public.tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_tasks" ON public.tasks;
CREATE POLICY "shared_update_tasks" ON public.tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_tasks" ON public.tasks;
CREATE POLICY "shared_delete_tasks" ON public.tasks FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "shared_select_habits" ON public.habits;
CREATE POLICY "shared_select_habits" ON public.habits FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_habits" ON public.habits;
CREATE POLICY "shared_insert_habits" ON public.habits FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_habits" ON public.habits;
CREATE POLICY "shared_update_habits" ON public.habits FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_habits" ON public.habits;
CREATE POLICY "shared_delete_habits" ON public.habits FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "shared_select_habit_completions" ON public.habit_completions;
CREATE POLICY "shared_select_habit_completions" ON public.habit_completions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_habit_completions" ON public.habit_completions;
CREATE POLICY "shared_insert_habit_completions" ON public.habit_completions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_habit_completions" ON public.habit_completions;
CREATE POLICY "shared_update_habit_completions" ON public.habit_completions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_habit_completions" ON public.habit_completions;
CREATE POLICY "shared_delete_habit_completions" ON public.habit_completions FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "shared_select_goals" ON public.goals;
CREATE POLICY "shared_select_goals" ON public.goals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_goals" ON public.goals;
CREATE POLICY "shared_insert_goals" ON public.goals FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_goals" ON public.goals;
CREATE POLICY "shared_update_goals" ON public.goals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_goals" ON public.goals;
CREATE POLICY "shared_delete_goals" ON public.goals FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "shared_select_profile_settings" ON public.profile_settings;
CREATE POLICY "shared_select_profile_settings" ON public.profile_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_profile_settings" ON public.profile_settings;
CREATE POLICY "shared_insert_profile_settings" ON public.profile_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_profile_settings" ON public.profile_settings;
CREATE POLICY "shared_update_profile_settings" ON public.profile_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_profile_settings" ON public.profile_settings;
CREATE POLICY "shared_delete_profile_settings" ON public.profile_settings FOR DELETE TO anon, authenticated USING (true);

INSERT INTO public.tasks (id, title, category, priority, due_label, completed, completed_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Review quarterly goals', 'Work', 'High', '9:00 AM', true, now()),
  ('00000000-0000-0000-0000-000000000002', 'Reply to project updates', 'Work', 'Medium', '11:30 AM', true, now()),
  ('00000000-0000-0000-0000-000000000003', 'Book a dentist appointment', 'Personal', 'Low', '2:00 PM', false, null),
  ('00000000-0000-0000-0000-000000000004', 'Plan tomorrow’s priorities', 'Planning', 'Medium', '5:30 PM', false, null)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.habits (id, name, icon, color, frequency)
VALUES
  ('00000000-0000-0000-0000-000000000011', 'Morning meditation', '✦', 'mint', 'Daily'),
  ('00000000-0000-0000-0000-000000000012', 'Read for 20 minutes', '▤', 'peach', 'Daily'),
  ('00000000-0000-0000-0000-000000000013', 'Drink 8 glasses of water', '◒', 'blue', 'Daily'),
  ('00000000-0000-0000-0000-000000000014', 'Weekly review', '⌁', 'lavender', 'Every Sunday')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.habit_completions (habit_id, completed_on)
VALUES
  ('00000000-0000-0000-0000-000000000011', CURRENT_DATE),
  ('00000000-0000-0000-0000-000000000011', CURRENT_DATE - 1),
  ('00000000-0000-0000-0000-000000000011', CURRENT_DATE - 2),
  ('00000000-0000-0000-0000-000000000012', CURRENT_DATE - 1),
  ('00000000-0000-0000-0000-000000000013', CURRENT_DATE - 2),
  ('00000000-0000-0000-0000-000000000014', CURRENT_DATE - 7)
ON CONFLICT (habit_id, completed_on) DO NOTHING;

INSERT INTO public.profile_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;
