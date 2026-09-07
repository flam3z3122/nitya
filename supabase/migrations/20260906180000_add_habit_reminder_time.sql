ALTER TABLE public.habits
ADD COLUMN IF NOT EXISTS reminder_time text;

ALTER TABLE public.habits
DROP CONSTRAINT IF EXISTS habits_reminder_time_check;

ALTER TABLE public.habits
ADD CONSTRAINT habits_reminder_time_check
CHECK (reminder_time IS NULL OR reminder_time ~ '^[0-2][0-9]:[0-5][0-9]$');
