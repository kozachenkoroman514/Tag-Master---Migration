DROP POLICY IF EXISTS "Authenticated users can view negative flags" ON public.negative_flags;

CREATE POLICY "Staff can view negative flags"
ON public.negative_flags
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'builder'::app_role)
  OR has_role(auth.uid(), 'shipper'::app_role)
  OR has_role(auth.uid(), 'mainliner'::app_role)
  OR has_role(auth.uid(), 'chassisliner'::app_role)
  OR has_role(auth.uid(), 'materials'::app_role)
  OR has_role(auth.uid(), 'other'::app_role)
);