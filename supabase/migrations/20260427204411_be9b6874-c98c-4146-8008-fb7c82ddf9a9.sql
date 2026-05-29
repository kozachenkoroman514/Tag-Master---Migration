-- negative_flags
CREATE TABLE public.negative_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id UUID,
  target_display_name TEXT NOT NULL,
  flagged_by_user_id UUID,
  flagged_by_display_name TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','auto')),
  order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.negative_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view negative flags"
  ON public.negative_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create negative flags"
  ON public.negative_flags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update negative flags"
  ON public.negative_flags FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete negative flags"
  ON public.negative_flags FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.negative_flags REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.negative_flags;

CREATE INDEX idx_negative_flags_target ON public.negative_flags(target_user_id);

-- builder_actions
CREATE TABLE public.builder_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  display_name TEXT NOT NULL DEFAULT '',
  order_id UUID,
  action TEXT NOT NULL CHECK (action IN ('start','complete','increment')),
  order_type TEXT CHECK (order_type IN ('crate','pallet')),
  units_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view builder actions"
  ON public.builder_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create builder actions"
  ON public.builder_actions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update builder actions"
  ON public.builder_actions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete builder actions"
  ON public.builder_actions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.builder_actions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_actions;

CREATE INDEX idx_builder_actions_user ON public.builder_actions(user_id);
CREATE INDEX idx_builder_actions_order ON public.builder_actions(order_id);
