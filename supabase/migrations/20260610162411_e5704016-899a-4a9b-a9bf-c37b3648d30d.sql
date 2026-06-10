CREATE POLICY "Anyone can upload support attachments"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'support-attachments');

CREATE POLICY "Service role can read support attachments"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'support-attachments');