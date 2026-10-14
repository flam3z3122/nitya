CREATE TABLE IF NOT EXISTS public.task_completion_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, completed_at)
);

CREATE INDEX IF NOT EXISTS task_completion_history_user_completed_idx
  ON public.task_completion_history (user_id, completed_at DESC);

ALTER TABLE public.task_completion_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_task_completion_history" ON public.task_completion_history;
CREATE POLICY "select_own_task_completion_history"
  ON public.task_completion_history
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.record_task_completion_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.completed AND NEW.completed_at IS NOT NULL AND NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
    INSERT INTO public.task_completion_history (user_id, task_id, completed_at)
    VALUES (NEW.user_id, NEW.id, NEW.completed_at)
    ON CONFLICT (task_id, completed_at) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_task_completion_history ON public.tasks;
CREATE TRIGGER record_task_completion_history
  AFTER INSERT OR UPDATE OF completed_at ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.record_task_completion_history();

INSERT INTO public.task_completion_history (user_id, task_id, completed_at)
SELECT user_id, id, completed_at
FROM public.tasks
WHERE completed AND completed_at IS NOT NULL
ON CONFLICT (task_id, completed_at) DO NOTHING;
