# Plan: Send Get Help submissions via email

## Goal
Every Get Help form submission emails **support@economicmobilitycenter.org**, keeping the existing per-path subject prefixes, [URGENT] tag for blocking/urgent issues, and structured body sections (Contact / Summary / Details).

## Step 1 — Set up email sending domain
Lovable Emails requires a verified sender domain. No domain is configured yet, so the first step is to set one up (e.g. `notify.economicmobilitycenter.org`). I'll surface the email setup dialog so you can add DNS records at your registrar.

After the domain is added, Lovable will:
- Create email infrastructure (queue, send log, suppression list, cron processor)
- Scaffold the app-email send route and an example template

DNS verification can take up to ~72 hours, but I can wire the code immediately — emails will start flowing once DNS is active.

## Step 2 — Create the support-submission email template
A new React Email template `support-submission` in `src/lib/email-templates/`:
- Subject: built dynamically per submission, matching the current logic
  - `[EMC Support] <Path Label> — <summary first 80 chars>`
  - Prefixed with `[URGENT]` when helpType=B, or helpType=C with severity=urgent/blocking
- Body sections (same as today's `buildEmailBody`):
  - Submitted timestamp + Path label
  - Contact: name, email, partner, campus, product, severity
  - Summary
  - Details (expectedDeliveryDate, neededByDate, whatHappened, stepsToReproduce, attachmentLinks)
- Registered in `src/lib/email-templates/registry.ts`

## Step 3 — Update `submitForm` to send the email
In `src/lib/submissions.functions.ts`:
- Keep the Supabase insert as the source of truth
- After insert, call the internal send route with:
  - `templateName: "support-submission"`
  - `recipientEmail: "support@economicmobilitycenter.org"`
  - `idempotencyKey: support-<submission id>`
  - `templateData`: subject, path label, urgent flag, and all the existing fields
- Remove the `data@economicmobilitycenter.org` routing — all paths go to support@
- Keep console logging as a fallback if the send fails (non-blocking)

## Step 4 — Verify
- Submit a test form on each of the 4 help paths
- Confirm rows appear in the email send log with `sent` status
- Confirm the inbox receives them with correct subjects (including [URGENT] for B + urgent C)

## What stays the same
- Form UI and fields
- Confirmation dialog copy shown to the user
- Supabase `support_submissions` table and payload shape
- Per-path subject prefixes and body section structure

## Out of scope
- Switching to a third-party email provider (Resend/SendGrid/etc.)
- Sending a copy/confirmation back to the submitter (can add later if you want)
- Changing the form fields or validation
