
CREATE TABLE IF NOT EXISTS public.printer_status (
  department text PRIMARY KEY,
  online boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id uuid,
  updated_by_display_name text NOT NULL DEFAULT ''
);

ALTER TABLE public.printer_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view printer status"
  ON public.printer_status FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert printer status"
  ON public.printer_status FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update printer status"
  ON public.printer_status FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete printer status"
  ON public.printer_status FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.printer_status (department, online) VALUES
  ('Shipping', false),
  ('Mainline', false),
  ('Chassisline', false),
  ('Woodshop', false)
ON CONFLICT (department) DO NOTHING;

ALTER TABLE public.printer_status REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.printer_status;
