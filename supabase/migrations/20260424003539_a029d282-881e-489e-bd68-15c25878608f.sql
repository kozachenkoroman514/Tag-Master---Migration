-- 1) Create new enum
CREATE TYPE public.app_role_new AS ENUM (
  'admin', 'builder', 'shipper', 'mainliner', 'chassisliner', 'other', 'viewer'
);

-- 2) Drop policies that depend on has_role(_, app_role) so we can change types
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view allowed emails" ON public.allowed_emails;
DROP POLICY IF EXISTS "Admins can insert allowed emails" ON public.allowed_emails;
DROP POLICY IF EXISTS "Admins can update allowed emails" ON public.allowed_emails;
DROP POLICY IF EXISTS "Admins can delete allowed emails" ON public.allowed_emails;

-- 3) Drop trigger + functions that reference the old enum
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role);

-- 4) Migrate user_roles.role to new enum (map old -> new)
ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE public.app_role_new
  USING (
    CASE role::text
      WHEN 'admin' THEN 'admin'
      WHEN 'viewer' THEN 'viewer'
      WHEN 'crater' THEN 'builder'
      WHEN 'palleter' THEN 'builder'
      WHEN 'recycler' THEN 'builder'
      ELSE 'viewer'
    END::public.app_role_new
  );

-- 5) Migrate allowed_emails.role to new enum
ALTER TABLE public.allowed_emails
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.allowed_emails
  ALTER COLUMN role TYPE public.app_role_new
  USING (
    CASE role::text
      WHEN 'admin' THEN 'admin'
      WHEN 'viewer' THEN 'viewer'
      WHEN 'crater' THEN 'builder'
      WHEN 'palleter' THEN 'builder'
      WHEN 'recycler' THEN 'builder'
      ELSE 'viewer'
    END::public.app_role_new
  );

ALTER TABLE public.allowed_emails
  ALTER COLUMN role SET DEFAULT 'viewer'::public.app_role_new;

-- 6) Drop old enum and rename new one to app_role
DROP TYPE public.app_role;
ALTER TYPE public.app_role_new RENAME TO app_role;

-- 7) Recreate has_role function with new enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 8) Recreate signup trigger with new enum
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

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9) Recreate dropped RLS policies
CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view allowed emails"
  ON public.allowed_emails FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert allowed emails"
  ON public.allowed_emails FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update allowed emails"
  ON public.allowed_emails FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete allowed emails"
  ON public.allowed_emails FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 10) Per-user permission overrides
CREATE TABLE public.user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);

ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all overrides"
  ON public.user_permission_overrides FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert overrides"
  ON public.user_permission_overrides FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update overrides"
  ON public.user_permission_overrides FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete overrides"
  ON public.user_permission_overrides FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_user_permission_overrides_updated_at
BEFORE UPDATE ON public.user_permission_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();