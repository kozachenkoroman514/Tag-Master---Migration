-- Reports: per-unit completion records, shared across all users
CREATE TABLE public.report_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  type TEXT NOT NULL,
  tier INTEGER NOT NULL DEFAULT 0,
  style TEXT NOT NULL DEFAULT '',
  option TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  ordered_by TEXT NOT NULL DEFAULT '',
  height NUMERIC,
  width NUMERIC NOT NULL,
  length NUMERIC NOT NULL,
  unit_number INTEGER NOT NULL,
  total_units INTEGER NOT NULL DEFAULT 1,
  need_by_date DATE,
  submission_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  comments TEXT NOT NULL DEFAULT '',
  project_name TEXT NOT NULL DEFAULT '',
  job_number TEXT NOT NULL DEFAULT '',
  sales_order_number TEXT NOT NULL DEFAULT '',
  cancelled BOOLEAN NOT NULL DEFAULT false,
  cancel_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  completed_by_user_id UUID,
  completed_by_display_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_records_order_id ON public.report_records(order_id);
CREATE INDEX idx_report_records_completed_at ON public.report_records(completed_at DESC);

ALTER TABLE public.report_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all report records"
ON public.report_records FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create report records"
ON public.report_records FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update report records"
ON public.report_records FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete report records"
ON public.report_records FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Track per-order start timestamps separately (one row per order, set on Print&Start)
CREATE TABLE public.order_starts (
  order_id UUID NOT NULL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_by_user_id UUID,
  started_by_display_name TEXT NOT NULL DEFAULT ''
);

ALTER TABLE public.order_starts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all order starts"
ON public.order_starts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create order starts"
ON public.order_starts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update order starts"
ON public.order_starts FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete order starts"
ON public.order_starts FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));