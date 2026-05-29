-- 1. Multi-job columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS job_numbers text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.report_records
  ADD COLUMN IF NOT EXISTS job_numbers text[] NOT NULL DEFAULT '{}'::text[];

-- 2. Shift pauses history
CREATE TABLE IF NOT EXISTS public.shift_pauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paused_at timestamptz NOT NULL DEFAULT now(),
  resumed_at timestamptz NULL,
  created_by_display_name text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS shift_pauses_paused_at_idx ON public.shift_pauses(paused_at);
CREATE INDEX IF NOT EXISTS shift_pauses_open_idx ON public.shift_pauses(resumed_at) WHERE resumed_at IS NULL;

ALTER TABLE public.shift_pauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view shift pauses"
  ON public.shift_pauses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert shift pauses"
  ON public.shift_pauses FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update shift pauses"
  ON public.shift_pauses FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete shift pauses"
  ON public.shift_pauses FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Updated pause/resume functions to also write history
CREATE OR REPLACE FUNCTION public.pause_timers()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_name text;
BEGIN
  SELECT COALESCE(NULLIF(display_name, ''), NULL) INTO v_name
    FROM public.profiles WHERE id = auth.uid();
  UPDATE public.timer_pause_state
    SET is_paused = true, paused_at = now(), paused_by = v_name, updated_at = now()
    WHERE id = 1 AND is_paused = false;
  -- Open a history row only if we actually transitioned (and no open row exists)
  IF FOUND AND NOT EXISTS (SELECT 1 FROM public.shift_pauses WHERE resumed_at IS NULL) THEN
    INSERT INTO public.shift_pauses (paused_at, created_by_display_name)
      VALUES (now(), COALESCE(v_name, ''));
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.resume_timers()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_paused_at timestamptz;
  v_now timestamptz := now();
  v_delta interval;
BEGIN
  SELECT paused_at INTO v_paused_at FROM public.timer_pause_state
    WHERE id = 1 AND is_paused = true;
  IF v_paused_at IS NULL THEN RETURN; END IF;
  v_delta := v_now - v_paused_at;

  -- Close open shift_pauses row(s)
  UPDATE public.shift_pauses SET resumed_at = v_now WHERE resumed_at IS NULL;

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
END $function$;