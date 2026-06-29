## What's changing

Replace the email + Google-Sheet notification flow with Jira ticket creation, routed by product using `Configuration/feedback-routing.json` from the EMC-Support-Resources GitHub repo.

## Behavior

1. User submits a Get Help form (any option A–E).
2. Server looks up the selected product slug in `feedback-routing.json`.
   - Match → use that route's `jiraEpic`, `issueType`, and `labels`.
   - No match (or no product selected) → use the `_fallback` entry (epic `PROD-244`, label `unrouted`).
3. Server creates a Jira issue in that project (parent = epic) with:
   - **Summary**: short summary from the form (path-prefixed, e.g. `[Data missing] …`).
   - **Description (ADF)**: contact name/email, partner, campus, product, severity, path, all `details` fields, plus signed URLs for any attachments uploaded to Supabase Storage (the existing signed-URL flow stays).
   - **Labels**: from routing config + a path tag (`question`, `report-missing`, `data-issue`, `feedback`, etc.).
4. The created issue key and browse URL are stored on the `support_submissions` row (new columns `jira_key`, `jira_url`, `jira_error`).
5. Confirmation modal shows the Jira key to the submitter ("Tracking ID: PROD-1234").

## Product field is now required

Because routing depends on product, the Product dropdown becomes required for every submission. If the user's org has only one product it's preselected (current behavior). Admin/internal users must pick one.

## What's removed

- The transactional email send (`support-submission-notification`) — no longer fired on submit.
- The Google Sheets append for Option E — Jira is now the system of record.

The email template files and Google Sheets helper stay in the repo (unused) so we can revive them later if needed; nothing about email infrastructure or the Slack failure channel is removed.

## What's kept

- Draft submission row + signed-URL attachment upload flow.
- `support_submissions` table as the durable log of every submission.
- Form UI, branching logic, validation (plus the new product-required rule).

## Technical details

### Secrets
Three new secrets via `add_secret`:
- `JIRA_SITE` — e.g. `economicmobilitycenter.atlassian.net`
- `JIRA_EMAIL` — Atlassian account email used to mint the API token
- `JIRA_API_TOKEN` — Atlassian API token (https://id.atlassian.com/manage-profile/security/api-tokens)

### Migration
Add to `support_submissions`: `jira_key text`, `jira_url text`, `jira_error text`.

### Files
- `src/lib/content.functions.ts` — also fetch `Configuration/feedback-routing.json`; expose `feedbackRouting` on the bundle.
- `src/lib/jira.server.ts` (new) — `createJiraIssue({ route, summary, descriptionAdf, labels })` using Basic auth (`email:token`) against `/rest/api/3/issue`, with the epic key set as `fields.parent.key`. Derives project key from epic prefix.
- `src/lib/submissions.functions.ts` — after the row insert/update, look up the route, build the ADF description (including signed attachment URLs), call `createJiraIssue`, update the row with `jira_key`/`jira_url`/`jira_error`. Remove the email enqueue + sheets append. Return `{ id, helpType, jiraKey, jiraUrl }`.
- `src/components/get-help-form.tsx` — mark Product required (validate in `buildPayload`); show the Jira key in the confirmation dialog when present.

### Failure handling
A Jira API failure does NOT block submission — the row is still saved and `jira_error` is populated; the confirmation modal falls back to the existing copy. Existing Slack failure-notification connector stays wired up for catastrophic errors via the standard console-error path.

## Out of scope
- No two-way sync (Jira → portal).
- No native Jira attachment upload (attachments still live in Supabase Storage; links are embedded in the description). We can add Jira attachment upload as a follow-up.
- No change to the public webhook / cron surface.
