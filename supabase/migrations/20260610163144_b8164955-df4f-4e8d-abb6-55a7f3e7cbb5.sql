
DROP POLICY IF EXISTS "Anyone can upload support attachments" ON storage.objects;

CREATE POLICY "Anyone can upload support attachments"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'support-attachments'
  AND name LIKE 'submissions/%'
  AND octet_length(name) < 512
  AND lower(name) ~ '\.(png|jpg|jpeg|gif|webp|heic|pdf|doc|docx|xls|xlsx|csv|txt)$'
);
