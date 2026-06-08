-- Explicit restrictive deny policies on support_submissions to document
-- that no client role (anon or authenticated) may read, update, or delete.
-- service_role bypasses RLS and remains the only path to this data.

CREATE POLICY "Deny all SELECT for clients"
  ON public.support_submissions
  AS RESTRICTIVE
  FOR SELECT
  TO anon, authenticated
  USING (false);

CREATE POLICY "Deny all UPDATE for clients"
  ON public.support_submissions
  AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny all DELETE for clients"
  ON public.support_submissions
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (false);