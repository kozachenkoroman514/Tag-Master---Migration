-- 2. Negative flags: enforce flagged_by_user_id = auth.uid() on insert
DROP POLICY IF EXISTS "Authenticated users can create negative flags" ON public.negative_flags;
CREATE POLICY "Authenticated users can create negative flags"
ON public.negative_flags
FOR INSERT
TO authenticated
WITH CHECK (flagged_by_user_id = auth.uid());

-- 3. Profiles: restrict email to self; allow other fields visible to all authenticated
-- Replace the broad SELECT with two policies: self can see all of own row; others can see non-email columns.
-- Postgres RLS is row-level not column-level, so simplest correct approach: only self can SELECT own row's email
-- by splitting into a self-policy and a public-non-self-but-without-email view? Instead we keep the
-- table readable but restrict via column privileges: grant SELECT on non-email columns to authenticated,
-- and only allow self to read the email column.
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Everyone authenticated can read profile rows
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Restrict email column access via column privileges
REVOKE SELECT (email) ON public.profiles FROM authenticated, anon;
-- Re-grant non-email columns to authenticated
GRANT SELECT (id, display_name, avatar_url, created_at, updated_at) ON public.profiles TO authenticated;

-- Create a security-definer helper so a user can fetch their OWN email
CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_email() TO authenticated;

-- 5. Revoke public EXECUTE on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_recycle_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;