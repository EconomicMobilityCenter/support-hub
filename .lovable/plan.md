# Plan: Unified "Get Help" tab

## 1. Navigation & routing

- Add new route `src/routes/get-help.tsx` titled **Get Help**.
- Update `src/components/site-header.tsx`: replace the two links "Report an issue" and "Get support" with a single "Get Help" link to `/get-help`.
- Update `src/routes/index.tsx` home tiles: replace the two tiles with one "Get Help" tile.
- Keep `/report-issue` and `/support` as redirects to `/get-help` (preserves any old links).  
- update the UI width to match the training page as well 

## 2. Form structure (`src/components/get-help-form.tsx`)

Built with shadcn `Form` + react-hook-form + Zod.

**Basic info** (always shown)

- Name (text, required)
- Email (email, required)
- Partner — if org is known via `?org=`, show org name as read-only; if public/unknown, free-text input
- Campus — free-text input
- Product — if org is known, dropdown of `org.products` (mapped through `PRODUCTS`); if public/unknown, free-text input

**How can we help you today?** — single select with 4 options:

- A — "I have a question"
- B — "My report wasn't delivered"
- C — "Data is missing or looks wrong"
- D — "Other"

**Conditional fields:**

*Option A & D* (shared):

- Helper text: "Our training tab has helpful FAQs and videos. If you can't find your answer there, let us know below. A team member will respond in 1–2 business days."
- Textarea: "Your question or comment" (required)

*Option B:*

- Date picker: "What date should this report have been delivered?" (required)
- Select: "Is this issue blocking you?" with plain-language severity (see §3)
- Date picker: "Do you need this data by a specific date?" (optional)

*Option C:*

- Short text: "Short summary of the issue" (required)
- Textarea: "What happened / what did you expect?" (required)
- Textarea: "Steps to reproduce" (optional)
- Select: "Is this issue blocking you?" (severity, see §3)
- Date picker: "Do you need this data by a specific date?" (optional)
- Text: "Attachment links (screenshots / files)" (optional, paste shareable links)

**Submit button** at the bottom.

## 3. Severity dropdown (plain-language)

Shared between Options B and C:

- `nice_to_have` — "Not blocking — would be nice to fix"
- `workaround` — "Inconvenient but I have a workaround"
- `blocking` — "Blocking me from doing my work"
- `urgent` — "Urgent — blocking my whole team / a deadline"

`urgent` and `blocking` both flag as "urgent" for email subject on Option C. (Open to refining — see assumptions.)

## 4. Confirmation modals (post-submit)

Replace the existing "Thanks — we got it" view with a Dialog modal whose body depends on the path:

- A / D: "Thanks for your submission! A team member will be reaching out in 1–2 business days to help you out."
- B: "Thank you for letting us know — a team member will be looking into this and responding as soon as possible."
- C: "Thank you for letting us know — our team will review this issue and respond as soon as possible."

After dismissal, return user to home.

## 5. Backend submission

Update `submitForm` in `src/lib/submissions.functions.ts`:

- Accept new path discriminator (`helpType`: A/B/C/D) and full payload.
- Store in existing `support_submissions` table — `type` becomes `'issue'` for B/C and `'support'` for A/D (fits existing CHECK constraint); the new structured fields (campus, helpType, severity, dates, etc.) go into `payload` jsonb. No migration needed.
- After successful insert, call new server-side email helper.

## 6. Email routing

Recipients:

- A, D → `support@economicmobilitycenter.org`
- B → `data@economicmobilitycenter.org`, subject prefixed with `[URGENT]`
- C → `data@economicmobilitycenter.org`, subject prefixed with `[URGENT]` only if severity is `urgent` or `blocking`

Email body: plain summary of all submitted fields plus submission date (UTC + local).

**Prerequisite (requires user action):** No email domain is configured yet. To send these emails we need to set up Lovable Emails first (verified sender subdomain). I'll surface the email setup step during build. After the domain is added, I'll scaffold the transactional-email infrastructure and a `get-help-notification` template, then wire it into the submit handler.

## 7. Cleanup

- Delete `src/routes/report-issue.tsx` and `src/routes/support.tsx` page bodies, replace with redirects to `/get-help`.
- Remove old `SubmissionForm` component once `get-help-form` covers all flows (or keep for now and delete after verification).

---

## Assumptions to confirm (will proceed with these unless you say otherwise)

1. **Severity → "urgent" subject rule for Option C**: I'll treat both `urgent` and `blocking` as urgent. If you only want the top tier flagged, say so.
2. **Partner field when org is known**: shown read-only (derived from the `?org=` link). OK?
3. **Campus**: free text now, no validation beyond length.
4. **Attachment links**: free text only — users paste Drive/OneDrive links. No file upload (Lovable Emails doesn't support attachments).
5. Keep `/report-issue` and `/support` as redirects rather than 404.