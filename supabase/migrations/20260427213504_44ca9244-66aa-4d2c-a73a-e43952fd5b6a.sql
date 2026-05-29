
CREATE TABLE public.team_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  end_of_month_mode BOOLEAN NOT NULL DEFAULT false,
  revenue_bar_mode TEXT NOT NULL DEFAULT 'total-vs-completed',
  monthly_revenue_goal NUMERIC NOT NULL DEFAULT 50000,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by_user_id UUID,
  updated_by_display_name TEXT NOT NULL DEFAULT ''
);

ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view team settings"
  ON public.team_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update team settings"
  ON public.team_settings FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can insert team settings"
  ON public.team_settings FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete team settings"
  ON public.team_settings FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_team_settings_updated_at
  BEFORE UPDATE ON public.team_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.team_settings (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.team_settings;
ALTER TABLE public.team_settings REPLICA IDENTITY FULL;
