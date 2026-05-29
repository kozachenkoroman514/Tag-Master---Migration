ALTER TABLE public.order_units
  ADD COLUMN IF NOT EXISTS cutting_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS edit_acknowledged boolean NOT NULL DEFAULT true;