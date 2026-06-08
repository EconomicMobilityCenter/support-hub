
CREATE TABLE public.support_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('issue','support')),
  org_id TEXT,
  org_name TEXT,
  product TEXT,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  summary TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.support_submissions TO anon, authenticated;
GRANT ALL ON public.support_submissions TO service_role;

ALTER TABLE public.support_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit"
  ON public.support_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
