-- Sequence used to derive a 1-99 cycling number
CREATE SEQUENCE IF NOT EXISTS public.recycle_number_seq START 1;

CREATE TABLE public.recycle_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recycle_number INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('crate','pallet')),
  style TEXT NOT NULL DEFAULT '',
  qty INTEGER NOT NULL DEFAULT 1,
  location TEXT NOT NULL DEFAULT '',
  length NUMERIC NOT NULL,
  width NUMERIC NOT NULL,
  height NUMERIC,
  added_date DATE NOT NULL DEFAULT (now()::date),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','pending','assigned')),
  pending_assignment JSONB,
  assignment JSONB,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recycle_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all recycle items"
  ON public.recycle_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create recycle items"
  ON public.recycle_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update recycle items"
  ON public.recycle_items FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete recycle items"
  ON public.recycle_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger: auto-assign recycle_number from sequence (cycles 1-99)
CREATE OR REPLACE FUNCTION public.assign_recycle_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.recycle_number IS NULL OR NEW.recycle_number = 0 THEN
    NEW.recycle_number := ((nextval('public.recycle_number_seq') - 1) % 99) + 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_recycle_number
  BEFORE INSERT ON public.recycle_items
  FOR EACH ROW EXECUTE FUNCTION public.assign_recycle_number();

CREATE TRIGGER update_recycle_items_updated_at
  BEFORE UPDATE ON public.recycle_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER TABLE public.recycle_items REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recycle_items;

CREATE INDEX idx_recycle_items_status ON public.recycle_items(status);
