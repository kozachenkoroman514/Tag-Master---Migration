-- Revoke direct column access to profiles.email from regular roles.
-- Admin email lookups continue to work through the SECURITY DEFINER
-- function admin_list_user_emails(); a user's own email is available via
-- get_my_email(). The "Authenticated users can view profiles" policy still
-- permits reading id, display_name, avatar_url, etc.
REVOKE SELECT (email) ON public.profiles FROM anon, authenticated;