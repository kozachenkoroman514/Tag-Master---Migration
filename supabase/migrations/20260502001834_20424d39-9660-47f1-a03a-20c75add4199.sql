-- Bug reports table
CREATE TABLE public.bug_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location TEXT NOT NULL DEFAULT 'other',
  other_location TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  urgency TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  submitted_by_user_id UUID,
  submitted_by_display_name TEXT NOT NULL DEFAULT '',
  in_progress_by_user_id UUID,
  in_progress_by_display_name TEXT NOT NULL DEFAULT '',
  in_progress_at TIMESTAMP WITH TIME ZONE,
  resolved_by_user_id UUID,
  resolved_by_display_name TEXT NOT NULL DEFAULT '',
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT NOT NULL DEFAULT '',
  screenshot_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view bug reports"
  ON public.bug_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create bug reports"
  ON public.bug_reports FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by_user_id = auth.uid());

CREATE POLICY "Admins can update bug reports"
  ON public.bug_reports FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete bug reports"
  ON public.bug_reports FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_bug_reports_updated_at
  BEFORE UPDATE ON public.bug_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_bug_reports_status ON public.bug_reports(status);
CREATE INDEX idx_bug_reports_created_at ON public.bug_reports(created_at DESC);

-- Storage bucket for screenshots (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('bug-screenshots', 'bug-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can view bug screenshots"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'bug-screenshots');

CREATE POLICY "Users can upload their own bug screenshots"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bug-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own bug screenshots"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bug-screenshots'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );