
-- 1. Add explicit RESTRICTIVE deny policies for anon/authenticated on email tables
CREATE POLICY "Deny all SELECT for clients" ON public.email_unsubscribe_tokens
  AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "Deny all INSERT for clients" ON public.email_unsubscribe_tokens
  AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Deny all UPDATE for clients" ON public.email_unsubscribe_tokens
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all DELETE for clients" ON public.email_unsubscribe_tokens
  AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

CREATE POLICY "Deny all SELECT for clients" ON public.email_send_log
  AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "Deny all INSERT for clients" ON public.email_send_log
  AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Deny all UPDATE for clients" ON public.email_send_log
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all DELETE for clients" ON public.email_send_log
  AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

CREATE POLICY "Deny all SELECT for clients" ON public.suppressed_emails
  AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "Deny all INSERT for clients" ON public.suppressed_emails
  AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Deny all UPDATE for clients" ON public.suppressed_emails
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all DELETE for clients" ON public.suppressed_emails
  AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

-- 2. Tighten storage policy on support-attachments: require the path's folder to be
-- a UUID matching an existing support_submissions row created within the last hour.
-- This prevents anonymous users from indefinitely consuming storage with arbitrary uploads.

DROP POLICY IF EXISTS "Anyone can upload support attachments" ON storage.objects;

CREATE POLICY "Upload only against active submission draft" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND name ~ '^submissions/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
    AND octet_length(name) < 512
    AND lower(name) ~ '\.(png|jpg|jpeg|gif|webp|heic|pdf|doc|docx|xls|xlsx|csv|txt)$'
    AND EXISTS (
      SELECT 1 FROM public.support_submissions s
      WHERE s.id::text = split_part(name, '/', 2)
        AND s.created_at > now() - interval '1 hour'
    )
  );

-- 3. Allow client INSERT into support_submissions to include status='draft' as well as 'new',
-- so the upload-then-finalize flow can create a draft row before uploading files.
DROP POLICY IF EXISTS "Anyone can submit valid form" ON public.support_submissions;
CREATE POLICY "Anyone can submit valid form" ON public.support_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    type = ANY (ARRAY['issue'::text, 'support'::text])
    AND char_length(contact_name) BETWEEN 1 AND 200
    AND char_length(contact_email) BETWEEN 3 AND 320
    AND contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(summary) BETWEEN 1 AND 5000
    AND (product IS NULL OR char_length(product) <= 200)
    AND (org_id IS NULL OR char_length(org_id) <= 200)
    AND (org_name IS NULL OR char_length(org_name) <= 300)
    AND status IN ('new', 'draft')
  );
