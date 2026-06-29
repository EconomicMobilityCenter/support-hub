## What's wrong

1. **Jira 404** — the last submission stored `Jira 404: Oops, you've found a dead link.` in `jira_error`. The Atlassian site for this workspace is `economicmobilitycenter.atlassian.net`, so the current `JIRA_SITE` secret is wrong (likely a full URL with a path, an `id.atlassian.com` link, or similar — those are the links you sent me).
2. **No Slack notification** — the existing Slack wiring only fires for email-send failures from the old flow. Nothing posts to Slack when a Jira ticket is created. `feedback-routing.json` does specify a `slackChannel` per product but it's currently unused.

## Fix plan

### 1. Correct `JIRA_SITE`
- Open the secure secret form for `JIRA_SITE` so you can replace the current value with exactly:
  ```
  economicmobilitycenter.atlassian.net
  ```
  (no `https://`, no path, no trailing slash — the code already strips those defensively).
- `JIRA_EMAIL` should be the Atlassian account email that owns the API token (e.g. your `@economicmobilitycenter.org` address). `JIRA_API_TOKEN` is the token from `id.atlassian.com/manage-profile/security/api-tokens` — keep as-is.

### 2. Post to Slack after a successful Jira create
- In `src/lib/submissions.functions.ts`, after `createJiraIssue` returns `ok: true`, call a new helper `postSlackNotification` in `src/lib/slack.server.ts` that sends a `chat.postMessage` to `route.slackChannel` via the Lovable connector gateway (`https://connector-gateway.lovable.dev/slack/api/chat.postMessage`) using `LOVABLE_API_KEY` + `SLACK_API_KEY`.
- Message contents:
  - Title line: `:ticket: New {Path label} — {Product label}` (e.g. "New Feedback — CCMR Weekly Workbook")
  - Fields: Submitted by (name + email), Partner/Org, Campus (if any), Severity (if any), Jira ticket as a link to `https://economicmobilitycenter.atlassian.net/browse/<KEY>`
  - Body: the submission summary (truncated to ~500 chars)
- Slack failures are non-blocking: log + store on the submission row in a new column-free way (reuse `jira_error` is wrong; we'll append to a `payload.slack_error` field via an update, no migration needed since `payload` is JSONB).

### 3. Surface failures more clearly
- When `jiraError` is set, the confirmation dialog still shows the generic "thanks" message. Add a small "Tracking ID unavailable — our team has been notified" footnote only when `jiraKey` is null, so you'll know in the UI if Jira fails again.

### 4. Verify end-to-end after the secret is corrected
- After you save the corrected `JIRA_SITE`, submit a test ticket from `/get-help`.
- Confirm in `support_submissions`: `jira_key` populated, `jira_error` null, and a Slack message lands in the configured channel (`C0BDZB5U03B`).
- If Jira returns a "parent field invalid" error (classic vs team-managed project mismatch), I'll add a fallback to set the epic via `customfield_10014` instead of `parent`.

## Technical notes

- The Slack channel ID `C0BDZB5U03B` from `feedback-routing.json` must be a channel the Lovable Slack bot is a member of (public channels are auto-joined; private channels need an explicit invite).
- No schema migration required. Slack errors land in `support_submissions.payload.slack_error`.
- Files touched:
  - `src/lib/jira.server.ts` — no logic change; only adds an exported `JIRA_BROWSE_BASE` helper if needed.
  - `src/lib/slack.server.ts` — **new**, gateway client + `postSlackNotification`.
  - `src/lib/submissions.functions.ts` — call Slack after Jira success, persist slack_error.
  - `src/components/get-help-form.tsx` — show "Tracking ID unavailable" footnote when `jiraKey` is null.
- The `JIRA_SITE` secret update opens Lovable's secure secret form; I can't write its value directly.
