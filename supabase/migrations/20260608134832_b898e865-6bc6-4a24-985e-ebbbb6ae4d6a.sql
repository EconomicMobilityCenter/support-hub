
DROP POLICY "Anyone can submit" ON public.support_submissions;

CREATE POLICY "Anyone can submit valid form"
  ON public.support_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    type IN ('issue','support')
    AND char_length(contact_name) BETWEEN 1 AND 200
    AND char_length(contact_email) BETWEEN 3 AND 320
    AND contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(summary) BETWEEN 1 AND 5000
    AND (product IS NULL OR char_length(product) <= 200)
    AND (org_id IS NULL OR char_length(org_id) <= 200)
    AND (org_name IS NULL OR char_length(org_name) <= 300)
    AND status = 'new'
  );
