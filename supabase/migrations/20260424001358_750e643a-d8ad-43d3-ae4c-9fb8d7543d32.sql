ALTER TABLE public.allowed_emails ADD COLUMN display_name TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _assigned_role public.app_role;
  _invited_name TEXT;
BEGIN
  SELECT role, display_name INTO _assigned_role, _invited_name
  FROM public.allowed_emails
  WHERE lower(email) = lower(NEW.email)
  LIMIT 1;

  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      _invited_name,
      NEW.email
    ),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(_assigned_role, 'viewer'::public.app_role))
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;