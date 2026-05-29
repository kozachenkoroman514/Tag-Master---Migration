-- Add edit_logs JSONB to recycle_items and report_records for admin edit auditing
ALTER TABLE public.recycle_items
  ADD COLUMN IF NOT EXISTS edit_logs jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.report_records
  ADD COLUMN IF NOT EXISTS edit_logs jsonb NOT NULL DEFAULT '[]'::jsonb;