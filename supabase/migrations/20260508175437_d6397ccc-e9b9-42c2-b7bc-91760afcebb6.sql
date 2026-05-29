CREATE TABLE IF NOT EXISTS public.timer_pause_state (
  id integer PRIMARY KEY DEFAULT 1,
  is_paused boolean NOT NULL DEFAULT false,
  paused_at timestamptz,
  paused_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT timer_pause_state_singleton CHECK (id = 1)
);

INSERT INTO public.timer_pause_state (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.timer_pause_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timer_pause_read_all" ON public.timer_pause_state;
CREATE POLICY "timer_pause_read_all"
  ON public.timer_pause_state FOR SELECT
  TO authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.timer_pause_state;

CREATE OR REPLACE FUNCTION public.pause_timers()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  UPDATE public.timer_pause_state
    SET is_paused = true, paused_at = now(), paused_by = v_email, updated_at = now()
    WHERE id = 1 AND is_paused = false;
END $$;

CREATE OR REPLACE FUNCTION public.resume_timers()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_paused_at timestamptz;
  v_now timestamptz := now();
  v_delta interval;
BEGIN
  SELECT paused_at INTO v_paused_at FROM public.timer_pause_state
    WHERE id = 1 AND is_paused = true;
  IF v_paused_at IS NULL THEN RETURN; END IF;
  v_delta := v_now - v_paused_at;

  UPDATE public.orders SET
    started_at = CASE
      WHEN started_at IS NULL THEN NULL
      WHEN started_at >= v_paused_at THEN v_now
      ELSE started_at + v_delta END,
    cutting_started_at = CASE
      WHEN cutting_started_at IS NULL THEN NULL
      WHEN cutting_started_at >= v_paused_at THEN v_now
      ELSE cutting_started_at + v_delta END,
    pending_started_at = CASE
      WHEN pending_started_at IS NULL THEN NULL
      WHEN pending_started_at >= v_paused_at THEN v_now
      ELSE pending_started_at + v_delta END,
    current_unit_started_at = CASE
      WHEN current_unit_started_at IS NULL THEN NULL
      WHEN current_unit_started_at >= v_paused_at THEN v_now
      ELSE current_unit_started_at + v_delta END,
    updated_at = v_now
  WHERE status IN ('cutting','pending','in-build');

  UPDATE public.timer_pause_state
    SET is_paused = false, paused_at = NULL, paused_by = NULL, updated_at = v_now
    WHERE id = 1;
END $$;

REVOKE ALL ON FUNCTION public.pause_timers() FROM public;
REVOKE ALL ON FUNCTION public.resume_timers() FROM public;
GRANT EXECUTE ON FUNCTION public.pause_timers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.resume_timers() TO authenticated;