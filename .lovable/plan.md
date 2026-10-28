# Plan: Stop depending on the GitHub API for normal content loads

## Summary
The portal will read one pre-built file, `Configuration/content-bundle.json`, from raw.githubusercontent.com. That replaces about 1 API call plus N raw fetches with a single raw fetch, and raw fetches don't count against the GitHub REST API rate limit. If the bundle is missing or broken, the portal uses today's tree-plus-raw path. The output `ContentBundle` stays byte-for-byte the same, so users see no change.

## File-by-file changes

### 1. `src/lib/content.functions.ts` (the only app file changed)
- **New `fetchPrebuiltBundle(): Promise<ContentBundle | null>`**
  - Fetch `${RAW_BASE}/Configuration/content-bundle.json` with `cache: "no-store"`.
  - Return `null` (so the fallback runs) on: a non-OK status, invalid JSON, a missing or non-object `files`, or zero entries left after filtering.
  - For each `[path, raw]` in `files`:
    - Re-apply `isContentPath(path)`, so a bad Action can't sneak in Configuration files.
    - Run the existing `contentSlug`, `contentDir` and `parseFrontmatter` (which already calls `rewriteRelativeUrls` and `resolveRelative`).
  - `orgsRaw` → the existing `parseJsonWithMissingClosingBraceRepair` + `normalizeOrg`, with the same warn-and-`{}` fallback.
  - `feedbackRoutingRaw` → the existing repair parse, with the same warn-and-`{}` fallback.
  - Log `generatedAt` once at info level so staleness shows up in logs.
- **Refactor, no behavior change:**
  - Lift `isContentPath`/`SKIP` out of `fetchBundle` to module scope, so the bundle path and the legacy path share one filter.
  - Move the orgs and feedback parsing into two small helpers, `parseOrgs(raw)` and `parseFeedbackRouting(raw)`, used by both paths. The logic is copied exactly.
- **`fetchBundle()`:**
  - Try `fetchPrebuiltBundle()` first. If it returns a bundle, use it.
  - Otherwise `console.warn("[content] content-bundle.json unavailable, falling back to GitHub API")` and run the current tree + raw logic unchanged.
- **`fetchGitHubApi()`:**
  - Remove the unauthenticated retry.
  - If the token is set and the status is 401/403, `console.warn` the status, `x-ratelimit-remaining` and `x-ratelimit-reset`, with a clear "GITHUB_TOKEN rejected or rate-limited" message. Never log the token itself.
  - Return the response. The caller already throws `Content tree <status>`.
  - If the token is unset, warn once per instance that the unauthenticated limit applies.
- **Unchanged:**
  - The `getContentBundleForServer` TTL (10 min), the 60 s failure backoff, `lastGood`, `getContent` and all exported types.
  - The token stays read inside server-only code (`process.env` in a server fn). Nothing is added to client code.

### 2. GitHub Action, in the content repo (provided as text for you to add; I can't commit to that repo)
- `.github/workflows/build-content-bundle.yml`: runs on push to `main`, ignoring `Configuration/content-bundle.json` itself so it doesn't loop.
- Steps:
  1. Checkout.
  2. A small Node script walks the tree with the same filter.
  3. It writes the JSON shape you proposed, sorted by path so diffs stay stable.
  4. It commits with `[skip ci]` using `GITHUB_TOKEN` with `contents: write`.

## Risks
- **Bundle size:** Markdown only, since PDFs are referenced by URL and not inlined. Expect tens to a few hundred KB, well within Worker memory (128 MB) and raw.githubusercontent's file limits. Watch it if it ever passes ~5 MB.
- **Stale window after a push:** the Action run (~30–60 s), plus raw.githubusercontent's CDN cache (~up to 5 min), plus our 10-min in-memory TTL per instance. Worst case is ~15 min, close to today's behavior.
- **Action failure or a skipped commit:** the bundle goes stale while new .md files exist. The `generatedAt` log makes this visible. The fallback only triggers when the bundle is *missing or invalid*, not when it's stale.
- **raw.githubusercontent.com outage or throttling:** it is rate-limited separately and far more generously, but not unlimited. The fallback and `lastGood` cover short blips.
- **Removing the unauth retry:** if the token is currently bad, the fallback path will now fail where it used to sometimes succeed. That is mitigated because the bundle path no longer uses the API at all.

## Step 6 (persist lastGood in the database): recommended, but as a small follow-up
**Why it's worth it:** it is the only thing that fixes the cold-instance + GitHub-down case, which is exactly what users are seeing. The cost is about 40 lines.
- **Table** `public.content_bundle_cache`:
  - `id text primary key` (a single row, `'main'`)
  - `bundle jsonb not null`
  - `generated_at timestamptz`
  - `updated_at timestamptz default now()`
- **RLS:** enabled, with **no** policies for anon/authenticated. `GRANT ALL TO service_role` only. Reads and writes happen server-side through the admin client, loaded via dynamic import inside the server fn. This is safe because the content is public anyway, and it avoids exposing a writable table.
- **Behavior:**
  - On a successful fetch, upsert, throttled to at most once per TTL per instance.
  - When a fetch fails and memory has no `lastGood`, read the row and serve it with `error` set exactly as today's lastGood path does.
- **Recommendation:** do steps 1–5 first. Add step 6 in the same change if you approve, since it's independent and low-risk.

## Scope confirmation
- No changes to the UI, routes, `use-content.ts`, `?org=` filtering, the orgs array, or the `ContentBundle`/`ContentItem`/`OrgConfig`/`FeedbackRoute` types.
- No secrets in client code.
- The only changes are `src/lib/content.functions.ts`, plus the migration if step 6 is approved, plus the Action text for you to add to the content repo.
