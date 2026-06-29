ALTER TABLE public.support_submissions
  ADD COLUMN IF NOT EXISTS jira_key text,
  ADD COLUMN IF NOT EXISTS jira_url text,
  ADD COLUMN IF NOT EXISTS jira_error text;