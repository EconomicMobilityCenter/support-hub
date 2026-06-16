## Add "Feedback and Requests" option to Get Help form

### 1. Form UI (`src/components/get-help-form.tsx`)
- Add `HelpType` value `"E"` with label **"Feedback and Requests"** to `HELP_OPTIONS`.
- Render an open comment textarea when `helpType === "E"` (same shape as Option A/D — single required field, max 5000 chars).
- Treat `E` as a `support`-type submission (no severity, no attachments).
- Reuse the existing confirmation dialog ("Thanks for your submission!").

### 2. Server submission (`src/lib/submissions.functions.ts`)
- Extend the `helpTypeEnum` to include `"E"`.
- Add `PATH_LABELS.E = "Feedback and Request"` so the existing support-submission email renders with a proper subject/label and includes the comment in the summary.
- After the email is enqueued, call a new helper `appendFeedbackToSheet(...)` (fire-and-forget, wrapped in try/catch so Sheet failures never break the submission).

### 3. Google Sheets integration
- Link the **Google Sheets** connector (requires user approval via `standard_connectors--connect`). No Google Sheets connection currently exists in this workspace.
- New file `src/lib/google-sheets.server.ts` exporting `appendFeedbackRow({ timestamp, name, partner, email, priority, description })`.
- Uses the connector gateway (`https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/{id}/values/{range}:append?valueInputOption=USER_ENTERED`) with `LOVABLE_API_KEY` + `GOOGLE_SHEETS_API_KEY` headers.
- Spreadsheet ID: `1wPynzW8YlYkol956ymhTyRE5bwWxLr8_CL7L0TIbiWw`. Target tab gid `1572056046` — we'll resolve the sheet name once via a `GET /spreadsheets/{id}` call and hardcode the resulting tab name as a constant (gid isn't directly usable in A1 notation).
- Row order appended: `[Timestamp ISO, Name, Partner, Email, "" (Priority blank), Description]`.

### 4. Slack notifications
- No change. Existing email-failure Slack alert already covers send failures. Sheet append failures are logged to console only (out of scope to alert on).

### Files touched
- edit `src/components/get-help-form.tsx`
- edit `src/lib/submissions.functions.ts`
- new `src/lib/google-sheets.server.ts`

### Open question
The target tab's exact **sheet name** (the text label on the tab, not the gid) — I can look it up automatically the first time I call the Sheets API after the connector is linked, or you can tell me now (e.g. "Feedback", "Requests", "Sheet1"). I'll proceed by auto-detecting unless you specify.
