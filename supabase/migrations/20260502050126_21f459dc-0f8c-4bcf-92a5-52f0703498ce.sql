-- Grant the new attention-approval permission to admins.
-- (The admin role gets ALL permissions in the app's permission resolver, but we
--  also seed it here for transparency / audit. Other roles intentionally omitted.)
INSERT INTO public.role_permissions (role, permission, granted)
VALUES ('admin'::public.app_role, 'dashboard.attention.approve', true)
ON CONFLICT DO NOTHING;