ALTER TABLE public.profile_settings
ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.protect_email_verified()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND auth.role() IS DISTINCT FROM 'service_role' THEN
    NEW.email_verified := OLD.email_verified;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profile_settings_protect_email_verified ON public.profile_settings;
CREATE TRIGGER profile_settings_protect_email_verified
BEFORE UPDATE ON public.profile_settings
FOR EACH ROW
EXECUTE PROCEDURE public.protect_email_verified();
