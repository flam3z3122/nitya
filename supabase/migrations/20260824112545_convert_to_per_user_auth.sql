/*
# Convert productivity tracker to per-user (authenticated) data model

## Summary
Converts the shared single-tenant workspace into a multi-user app where each
authenticated user only sees and modifies their own data. Adds a `user_id` owner
column (defaulted to auth.uid()) to every table and replaces the open shared
policies with owner-scoped RLS policies.

## Data Cleanup (runs FIRST)
- Old seed rows have no owning user, so they are deleted before adding NOT NULL
  user_id columns. New users start with a clean workspace.

## New Columns
1. tasks.user_id, 2. habits.user_id, 3. habit_completions.user_id,
4. goals.user_id, 5. profile_settings.user_id — all uuid NOT NULL DEFAULT auth.uid()

## Security Changes
- All shared_* policies (TO anon, authenticated; USING true) are DROPPED.
- New owner-scoped policies on every table: SELECT/INSERT/UPDATE/DELETE
  scoped TO authenticated with auth.uid() = user_id.
- anon role no longer has access — app requires a signed-in session.

## Important Notes
1. Email confirmation stays OFF.
2. user_id columns default to auth.uid() so .insert({ title }) works without
   the client threading the owner ID.
3. Idempotent — safe to re-run.
*/

-- Delete old seed rows FIRST (they have no owner)
DELETE FROM public.tasks;
DELETE FROM public.habit_completions;
DELETE FROM public.habits;
DELETE FROM public.goals;
DELETE FROM public.profile_settings;

-- Drop old unique constraint on habit_completions before adding user_id
ALTER TABLE public.habit_completions DROP CONSTRAINT IF EXISTS habit_completions_habit_id_completed_on_key;

-- Add user_id to tasks
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'user_id') THEN
    ALTER TABLE public.tasks ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON public.tasks (user_id);

-- Add user_id to habits
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'habits' AND column_name = 'user_id') THEN
    ALTER TABLE public.habits ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS habits_user_id_idx ON public.habits (user_id);

-- Add user_id to habit_completions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'habit_completions' AND column_name = 'user_id') THEN
    ALTER TABLE public.habit_completions ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS habit_completions_user_id_idx ON public.habit_completions (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS habit_completions_user_habit_date_idx ON public.habit_completions (user_id, habit_id, completed_on);

-- Add user_id to goals
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'user_id') THEN
    ALTER TABLE public.goals ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS goals_user_id_idx ON public.goals (user_id);

-- Add user_id to profile_settings
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profile_settings' AND column_name = 'user_id') THEN
    ALTER TABLE public.profile_settings ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS profile_settings_user_id_idx ON public.profile_settings (user_id);

-- ===================== RLS POLICIES =====================

-- TASKS
DROP POLICY IF EXISTS "shared_select_tasks" ON public.tasks;
DROP POLICY IF EXISTS "shared_insert_tasks" ON public.tasks;
DROP POLICY IF EXISTS "shared_update_tasks" ON public.tasks;
DROP POLICY IF EXISTS "shared_delete_tasks" ON public.tasks;

CREATE POLICY "select_own_tasks" ON public.tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_tasks" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_tasks" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- HABITS
DROP POLICY IF EXISTS "shared_select_habits" ON public.habits;
DROP POLICY IF EXISTS "shared_insert_habits" ON public.habits;
DROP POLICY IF EXISTS "shared_update_habits" ON public.habits;
DROP POLICY IF EXISTS "shared_delete_habits" ON public.habits;

CREATE POLICY "select_own_habits" ON public.habits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_habits" ON public.habits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_habits" ON public.habits FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_habits" ON public.habits FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- HABIT_COMPLETIONS
DROP POLICY IF EXISTS "shared_select_habit_completions" ON public.habit_completions;
DROP POLICY IF EXISTS "shared_insert_habit_completions" ON public.habit_completions;
DROP POLICY IF EXISTS "shared_update_habit_completions" ON public.habit_completions;
DROP POLICY IF EXISTS "shared_delete_habit_completions" ON public.habit_completions;

CREATE POLICY "select_own_habit_completions" ON public.habit_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_habit_completions" ON public.habit_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_habit_completions" ON public.habit_completions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_habit_completions" ON public.habit_completions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- GOALS
DROP POLICY IF EXISTS "shared_select_goals" ON public.goals;
DROP POLICY IF EXISTS "shared_insert_goals" ON public.goals;
DROP POLICY IF EXISTS "shared_update_goals" ON public.goals;
DROP POLICY IF EXISTS "shared_delete_goals" ON public.goals;

CREATE POLICY "select_own_goals" ON public.goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_goals" ON public.goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_goals" ON public.goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_goals" ON public.goals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- PROFILE_SETTINGS
DROP POLICY IF EXISTS "shared_select_profile_settings" ON public.profile_settings;
DROP POLICY IF EXISTS "shared_insert_profile_settings" ON public.profile_settings;
DROP POLICY IF EXISTS "shared_update_profile_settings" ON public.profile_settings;
DROP POLICY IF EXISTS "shared_delete_profile_settings" ON public.profile_settings;

CREATE POLICY "select_own_profile_settings" ON public.profile_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_profile_settings" ON public.profile_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_profile_settings" ON public.profile_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_profile_settings" ON public.profile_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);
