
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cutting_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS pending_started_at timestamptz;

ALTER TABLE public.report_records
  ADD COLUMN IF NOT EXISTS cutting_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS pending_started_at timestamptz;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('queued','cutting','pending','in-build','complete','cancelled','hold','attention'));

UPDATE public.orders
SET
  status = 'pending',
  pending_started_at = COALESCE(pending_started_at, now()),
  cutting_started_at = NULL,
  started_at = NULL,
  started_by_user_id = NULL
WHERE status = 'in-build';
