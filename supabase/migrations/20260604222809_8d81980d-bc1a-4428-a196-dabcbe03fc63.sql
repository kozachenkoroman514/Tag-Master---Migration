-- Drop all leftover tables and functions from cloned project (Tag Master labels app is client-side only)

-- Drop tables (CASCADE removes dependent policies, FKs, triggers)
DROP TABLE IF EXISTS public.allowed_emails CASCADE;
DROP TABLE IF EXISTS public.bug_reports CASCADE;
DROP TABLE IF EXISTS public.builder_actions CASCADE;
DROP TABLE IF EXISTS public.negative_flags CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.order_starts CASCADE;
DROP TABLE IF EXISTS public.order_units CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.printer_status CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.recycle_items CASCADE;
DROP TABLE IF EXISTS public.report_records CASCADE;
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.shift_pauses CASCADE;
DROP TABLE IF EXISTS public.team_settings CASCADE;
DROP TABLE IF EXISTS public.timer_pause_state CASCADE;
DROP TABLE IF EXISTS public.toast_log CASCADE;
DROP TABLE IF EXISTS public.user_badges CASCADE;
DROP TABLE IF EXISTS public.user_permission_overrides CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.assign_recycle_number() CASCADE;
DROP FUNCTION IF EXISTS public.admin_list_user_emails() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_email() CASCADE;
DROP FUNCTION IF EXISTS public.trim_toast_log() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.is_email_allowed(text) CASCADE;
DROP FUNCTION IF EXISTS public.pause_timers() CASCADE;
DROP FUNCTION IF EXISTS public.resume_timers() CASCADE;

-- Drop sequence and enum type
DROP SEQUENCE IF EXISTS public.recycle_number_seq CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Drop the auth trigger that referenced handle_new_user (if it exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;