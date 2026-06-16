## Goal

When the email queue processor hits a send failure (transient retry, 429 rate-limit, 403 forbidden, or DLQ move), post a message to the Slack `#error-notifications` channel so the team gets real-time visibility.

## Slack message format

```
🚨 Support Portal
Time: 2026-06-16 14:32:08 UTC
Recipient: user@example.com
Template: support-submission-notification
Failure type: transient | rate_limited | forbidden | dlq
Error: <error message, truncated to 500 chars>
```

## Implementation

1. **Link Slack connection** — link the existing "Economic Mobility Center Slack" workspace connection to this project so `SLACK_API_KEY` is available to server code.

2. **New helper** `src/lib/slack-notify.server.ts`
   - `notifyEmailError({ queue, recipient, template, failureType, error })` — posts to `#error-notifications` via the Lovable connector gateway (`https://connector-gateway.lovable.dev/slack/api/chat.postMessage`) using `LOVABLE_API_KEY` + `SLACK_API_KEY`.
   - Wrapped in try/catch — Slack failures must never break the email processor.
   - Channel name `#error-notifications` is hard-coded; the gateway resolves it.

3. **Wire into `src/routes/lovable/email/queue/process.ts`**
   - After each `email_send_log` insert with `status: 'failed'` or `status: 'dlq'`, call `notifyEmailError(...)` with the right `failureType` (`transient`, `rate_limited`, `forbidden`, `dlq`).
   - Fire-and-forget (await but inside try/catch) so a Slack outage doesn't stall the queue worker.

## Out of scope

- No new tables, no migrations.
- No UI changes.
- No notifications for successful sends or suppression list hits.
- No de-dupe/throttling on the Slack side — if you want that later we can add a cooldown using `email_send_state`.
