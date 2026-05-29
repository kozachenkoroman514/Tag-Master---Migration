-- 1. Profiles: hide email column from non-admins (column-level security)
REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (id, display_name, avatar_url, created_at, updated_at) ON public.profiles TO authenticated;
-- email column intentionally excluded; admins use public.admin_list_user_emails()

-- 2. user_permission_overrides: admin-only SELECT
DROP POLICY IF EXISTS "Authenticated users can view all overrides" ON public.user_permission_overrides;
CREATE POLICY "Admins can view overrides"
  ON public.user_permission_overrides FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. team_settings: admin-only UPDATE
DROP POLICY IF EXISTS "Authenticated users can update team settings" ON public.team_settings;
CREATE POLICY "Admins can update team settings"
  ON public.team_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));