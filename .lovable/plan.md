## Changes to `src/components/get-help-form.tsx`

### Option B — "My report wasn't delivered"
- Keep: expected delivery date (required), severity dropdown (now **optional**).
- Add: **Comments** textarea (required, label "Additional details", maxLength 5000). Written into `details.comments` and used as `summary` (since severity won't drive subject; expected-date summary stays).
- Severity validation: remove the "Please tell us how blocking this is" check for B.

### Option C — "Data is missing or looks wrong"
Remove:
- "What happened / what did you expect?" textarea (`whatHappened` state + validation + `details.whatHappened`).
- "Do you have specific steps to reproduce this?" textarea (`steps` state + `details.stepsToReproduce`).

Keep: short summary (required), severity (still required for C — unchanged unless told otherwise).

Add new fields directly **below the short summary**, in this order:
1. **Date of report** — `DatePickerField`, required. Stored as `details.reportDate` (yyyy-MM-dd).
2. **Which tab is affected?** — text input, required, maxLength 200. → `details.tabAffected`.
3. **Which section / field is affected?** — text input, required, maxLength 200. → `details.sectionAffected`.
4. **Other comments** — textarea, optional, maxLength 5000. → `details.comments`.

Attachments (replaces the current paste-links input):
- **Required** for Option C.
- File `<input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt">` rendered with a styled label button.
- Show selected filenames with a remove button per file.
- Client-side validation: at least 1 file, each ≤ 10MB, total ≤ 25MB.
- On submit: upload each file via the browser supabase client to bucket `support-attachments` at path `submissions/<uuid>/<filename>`, then pass the resulting object paths to `submitForm` as `details.attachmentPaths` (array of strings, joined with `\n` when written to the submission `details` record).

### Severity options
Unchanged from previous turn (Minor/Moderate/Major/Critical labels).

## Changes to `src/lib/submissions.functions.ts`

- Extend `baseSchema.details` to allow `string | string[]` values (currently `z.unknown()` — already permissive, just confirm). No type changes required to backend.
- `buildEmailBody`: when `details.attachmentPaths` is an array, render each path on its own line under `--- Details ---`.

No DB schema change. The existing `support_submissions.payload` JSONB column already stores the spread `details`.

## New: storage bucket `support-attachments` (private)

- Create private bucket via `supabase--storage_create_bucket` (name `support-attachments`, public false).
- RLS policies on `storage.objects` via migration:
  - `INSERT` allowed to `anon` and `authenticated` when `bucket_id = 'support-attachments'` (form is on a public route; anyone filling out the form can upload).
  - `SELECT` restricted to `service_role` only (no public reads — internal team accesses via admin).
  - No `UPDATE` / `DELETE` policies (immutable from the client).

## Order of operations
1. Create bucket (`supabase--storage_create_bucket`).
2. Migration: RLS policies on `storage.objects` for the bucket.
3. Edit `src/components/get-help-form.tsx` and `src/lib/submissions.functions.ts`.

## Out of scope
- No change to Option A / D.
- No change to severity enum values or labels.
- No admin UI for viewing attachments — accessed via storage directly by the support team.
