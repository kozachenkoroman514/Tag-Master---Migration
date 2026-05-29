CREATE OR REPLACE FUNCTION public.pause_timers()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_name text;
BEGIN
  SELECT COALESCE(NULLIF(display_name, ''), NULL) INTO v_name
    FROM public.profiles WHERE id = auth.uid();
  UPDATE public.timer_pause_state
    SET is_paused = true, paused_at = now(), paused_by = v_name, updated_at = now()
    WHERE id = 1 AND is_paused = false;
END $$;