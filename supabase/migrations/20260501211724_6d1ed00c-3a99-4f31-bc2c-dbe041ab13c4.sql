-- Replace the old single 'dashboard.priority.override.inbuild' permission with split any/scoped variants.
DELETE FROM public.role_permissions WHERE permission = 'dashboard.priority.override.inbuild';

-- Grant the scoped (own department) variant to all dept-scoped roles by default.
INSERT INTO public.role_permissions (role, permission, granted) VALUES
  ('shipper'::public.app_role,      'dashboard.priority.override.inbuild.scoped', true),
  ('mainliner'::public.app_role,    'dashboard.priority.override.inbuild.scoped', true),
  ('chassisliner'::public.app_role, 'dashboard.priority.override.inbuild.scoped', true),
  ('materials'::public.app_role,    'dashboard.priority.override.inbuild.scoped', true),
  ('builder'::public.app_role,      'dashboard.priority.override.inbuild.any',    true),
  ('other'::public.app_role,        'dashboard.priority.override.inbuild.any',    true)
ON CONFLICT DO NOTHING;