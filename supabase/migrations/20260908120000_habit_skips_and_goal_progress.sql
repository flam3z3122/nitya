CREATE TABLE IF NOT EXISTS public.habit_skips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  skipped_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, habit_id, skipped_on)
);

CREATE INDEX IF NOT EXISTS habit_skips_user_id_idx ON public.habit_skips (user_id);
CREATE INDEX IF NOT EXISTS habit_skips_habit_date_idx ON public.habit_skips (habit_id, skipped_on DESC);

ALTER TABLE public.habit_skips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_habit_skips" ON public.habit_skips;
CREATE POLICY "select_own_habit_skips" ON public.habit_skips FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_habit_skips" ON public.habit_skips;
CREATE POLICY "insert_own_habit_skips" ON public.habit_skips FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_habit_skips" ON public.habit_skips;
CREATE POLICY "update_own_habit_skips" ON public.habit_skips FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_habit_skips" ON public.habit_skips;
CREATE POLICY "delete_own_habit_skips" ON public.habit_skips FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';

ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS target integer NOT NULL DEFAULT 10;

ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0;

ALTER TABLE public.goals
DROP CONSTRAINT IF EXISTS goals_target_check;

ALTER TABLE public.goals
ADD CONSTRAINT goals_target_check CHECK (target >= 1 AND target <= 9999);

ALTER TABLE public.goals
DROP CONSTRAINT IF EXISTS goals_progress_check;

ALTER TABLE public.goals
ADD CONSTRAINT goals_progress_check CHECK (progress >= 0 AND progress <= 9999);
