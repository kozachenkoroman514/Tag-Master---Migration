
INSERT INTO public.role_permissions (role, permission, granted) VALUES
  ('admin','dashboard.printer.toggle.any',true),
  ('admin','dashboard.printer.toggle.scoped',true),
  ('builder','dashboard.printer.toggle.any',true),
  ('builder','dashboard.printer.toggle.scoped',false),
  ('other','dashboard.printer.toggle.any',true),
  ('other','dashboard.printer.toggle.scoped',false),
  ('shipper','dashboard.printer.toggle.any',false),
  ('shipper','dashboard.printer.toggle.scoped',true),
  ('mainliner','dashboard.printer.toggle.any',false),
  ('mainliner','dashboard.printer.toggle.scoped',true),
  ('chassisliner','dashboard.printer.toggle.any',false),
  ('chassisliner','dashboard.printer.toggle.scoped',true),
  ('materials','dashboard.printer.toggle.any',false),
  ('materials','dashboard.printer.toggle.scoped',true),
  ('viewer','dashboard.printer.toggle.any',false),
  ('viewer','dashboard.printer.toggle.scoped',false)
ON CONFLICT DO NOTHING;
