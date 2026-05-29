-- 1. order_units table
CREATE TABLE public.order_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  unit_index integer NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  started_by_user_id uuid,
  started_by_display_name text NOT NULL DEFAULT '',
  completed_by_user_id uuid,
  completed_by_display_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, unit_index)
);

CREATE INDEX idx_order_units_order_id ON public.order_units(order_id);
CREATE INDEX idx_order_units_status ON public.order_units(status);

-- 2. RLS
ALTER TABLE public.order_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view order units"
  ON public.order_units FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create order units"
  ON public.order_units FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update order units"
  ON public.order_units FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete order units"
  ON public.order_units FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. updated_at trigger
CREATE TRIGGER trg_order_units_updated_at
  BEFORE UPDATE ON public.order_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Realtime
ALTER TABLE public.order_units REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_units;

-- 5. Backfill existing multi-unit orders
DO $$
DECLARE
  o record;
  i integer;
  unit_status text;
  unit_started timestamptz;
  unit_completed timestamptz;
BEGIN
  FOR o IN SELECT id, number_of_units, units_completed, status,
                   current_unit_started_at, completed_at, completed_by_user_id
            FROM public.orders
            WHERE number_of_units > 1
  LOOP
    FOR i IN 1..o.number_of_units LOOP
      unit_started := NULL;
      unit_completed := NULL;
      IF i <= o.units_completed THEN
        unit_status := 'complete';
        unit_completed := COALESCE(o.completed_at, now());
      ELSIF i = o.units_completed + 1 AND o.status = 'in-build' AND o.current_unit_started_at IS NOT NULL THEN
        unit_status := 'in-build';
        unit_started := o.current_unit_started_at;
      ELSIF o.status = 'pending' OR o.status = 'in-build' THEN
        unit_status := 'pending';
      ELSIF o.status = 'complete' THEN
        unit_status := 'complete';
        unit_completed := COALESCE(o.completed_at, now());
      ELSE
        unit_status := 'queued';
      END IF;

      INSERT INTO public.order_units (order_id, unit_index, status, started_at, completed_at)
      VALUES (o.id, i, unit_status, unit_started, unit_completed)
      ON CONFLICT (order_id, unit_index) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 6. Update resume_timers to shift order_units.started_at as well
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

  UPDATE public.order_units SET
    started_at = CASE
      WHEN started_at IS NULL THEN NULL
      WHEN started_at >= v_paused_at THEN v_now
      ELSE started_at + v_delta END,
    updated_at = v_now
  WHERE status = 'in-build';

  UPDATE public.timer_pause_state
    SET is_paused = false, paused_at = NULL, paused_by = NULL, updated_at = v_now
    WHERE id = 1;
END $function$;