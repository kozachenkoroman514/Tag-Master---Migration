
ALTER TABLE public.user_badges
  ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

-- Storage UPDATE policy for bug-screenshots bucket
DROP POLICY IF EXISTS "Users can update own bug screenshots" ON storage.objects;
CREATE POLICY "Users can update own bug screenshots"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bug-screenshots'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
)
WITH CHECK (
  bucket_id = 'bug-screenshots'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);
