CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_recent_support_submission_draft(_submission_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF _submission_id IS NULL OR _submission_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;

  _id := _submission_id::uuid;

  RETURN EXISTS (
    SELECT 1
    FROM public.support_submissions s
    WHERE s.id = _id
      AND s.status = 'draft'
      AND s.created_at > now() - interval '1 hour'
  );
END;
$$;

GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_recent_support_submission_draft(text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Upload only against active submission draft" ON storage.objects;

CREATE POLICY "Upload only against active submission draft" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND name ~ '^submissions/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
    AND octet_length(name) < 512
    AND lower(name) ~ '\.(png|jpg|jpeg|gif|webp|heic|pdf|doc|docx|xls|xlsx|csv|txt)$'
    AND private.is_recent_support_submission_draft(split_part(name, '/', 2))
  );

REVOKE EXECUTE ON FUNCTION public.is_recent_support_submission_draft(text) FROM PUBLIC, anon, authenticated, service_role;
DROP FUNCTION IF EXISTS public.is_recent_support_submission_draft(text);