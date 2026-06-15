## Problem

Form submissions save to the database but no email is sent. The current server function just `console.log`s the email body with a "will be wired to Lovable Emails once the project's sender domain is configured" comment.

## Plan

1. **Set up Lovable email infrastructure** using a default Lovable sender subdomain (no DNS setup required from you). This creates the email queue, send log, and processing route.

2. **Scaffold app email templates** and add a new template `support-submission-notification` that renders the submission details (path/type, contact name + email, partner, campus, product, severity, summary, and any extra `details` fields) in a clean branded layout matching the EMC styling.

3. **Wire the send into `submitForm`** in `src/lib/submissions.functions.ts`:
   - After the row is saved, enqueue the email through the Lovable email send route (server-side, using the service role).
   - Recipient: `support@economicmobilitycenter.org` for every submission (per your answer).
   - Subject: keep the existing `[EMC Support] <path> — <summary>` format, prefixed with `[URGENT]` when severity is `urgent`/`blocking` or path is "Report not delivered".
   - Set `reply_to` to the submitter's email so you can reply directly from the notification.
   - Idempotency key derived from the submission ID so retries don't duplicate.
   - Remove the `console.log`-only stub.

4. **Keep all existing behavior**: draft submission creation, attachment uploads, finalize step, success modal, validation, and field logic stay untouched. Only the post-save notification path changes.

5. **Verify**: submit a test form, confirm the row in `support_submissions`, confirm a `sent` row in `email_send_log`, and confirm the email arrives at support@economicmobilitycenter.org.

## Notes

- Using the default Lovable sender means the From address will be a Lovable-managed no-reply address; replies go to the submitter via `reply_to`. You can switch to a branded `notify.economicmobilitycenter.org` sender later without changing any app code — just add the domain and the same templates keep working.
- No new secrets are needed; `LOVABLE_API_KEY` and the service role key are already configured.
