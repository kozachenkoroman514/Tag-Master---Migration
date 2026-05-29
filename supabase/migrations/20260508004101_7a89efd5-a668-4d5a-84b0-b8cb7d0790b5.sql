
-- Shared alert notifications
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind text NOT NULL DEFAULT 'info',
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  sticky boolean NOT NULL DEFAULT false,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  required_permission text,
  acknowledged boolean NOT NULL DEFAULT false,
  stable_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view notifications"
  ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update notifications"
  ON public.notifications FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
-- Allow non-admin authenticated users to delete non-sticky alerts (mirrors current UX)
CREATE POLICY "Authenticated users can delete non-sticky notifications"
  ON public.notifications FOR DELETE TO authenticated USING (sticky = false);

CREATE TRIGGER notifications_set_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Shared pop-up log
CREATE TABLE public.toast_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variant text NOT NULL DEFAULT 'message',
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_toast_log_created_at ON public.toast_log(created_at DESC);

ALTER TABLE public.toast_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view toast log"
  ON public.toast_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create toast log entries"
  ON public.toast_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete toast log entries"
  ON public.toast_log FOR DELETE TO authenticated USING (true);

-- Cap toast_log to most recent 30 entries
CREATE OR REPLACE FUNCTION public.trim_toast_log()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.toast_log
  WHERE id IN (
    SELECT id FROM public.toast_log
    ORDER BY created_at DESC
    OFFSET 30
  );
  RETURN NULL;
END;
$$;

CREATE TRIGGER trim_toast_log_after_insert
  AFTER INSERT ON public.toast_log
  FOR EACH STATEMENT EXECUTE FUNCTION public.trim_toast_log();

-- Enable realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.toast_log REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.toast_log;
