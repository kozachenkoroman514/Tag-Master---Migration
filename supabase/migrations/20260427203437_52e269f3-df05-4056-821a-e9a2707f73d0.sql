-- Orders table: shared, live across all users
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('crate','pallet')),
  ordered_by TEXT NOT NULL,
  ordered_by_user_id UUID,
  job_number TEXT NOT NULL DEFAULT '',
  sales_order_number TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL,
  number_of_units INTEGER NOT NULL DEFAULT 1,
  height NUMERIC,
  width NUMERIC NOT NULL,
  length NUMERIC NOT NULL,
  need_by_date DATE NOT NULL,
  submission_date DATE NOT NULL DEFAULT (now()::date),
  project_name TEXT NOT NULL DEFAULT '',
  comments TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('top','hot','normal')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','in-build','complete','cancelled','hold','attention')),
  units_completed INTEGER NOT NULL DEFAULT 0,
  edited_at TIMESTAMPTZ,
  edit_acknowledged BOOLEAN NOT NULL DEFAULT true,
  hold_from_in_build BOOLEAN NOT NULL DEFAULT false,
  hold_acknowledged BOOLEAN NOT NULL DEFAULT true,
  previous_status TEXT,
  crate_style TEXT,
  crate_option TEXT,
  pallet_style TEXT,
  pallet_option TEXT,
  edit_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  revenue NUMERIC,
  started_by_user_id UUID,
  started_at TIMESTAMPTZ,
  completed_by_user_id UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can view all orders (Dashboard is shared)
CREATE POLICY "Authenticated users can view all orders"
  ON public.orders FOR SELECT TO authenticated USING (true);

-- Any authenticated user can create orders (gating handled by app permissions)
CREATE POLICY "Authenticated users can create orders"
  ON public.orders FOR INSERT TO authenticated WITH CHECK (true);

-- Any authenticated user can update orders (app enforces dept-scoped edit/hold/cancel)
CREATE POLICY "Authenticated users can update orders"
  ON public.orders FOR UPDATE TO authenticated USING (true);

-- Only admins can hard-delete (removeOrders); regular flows use status changes
CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime support
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Helpful indexes
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_department ON public.orders(department);
CREATE INDEX idx_orders_need_by_date ON public.orders(need_by_date);
