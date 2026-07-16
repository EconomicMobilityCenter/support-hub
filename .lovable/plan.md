# Fix "Content list 403 for /" from GitHub

## Root cause

`src/lib/content.functions.ts` reads training content from the public GitHub API (`api.github.com/repos/.../contents`). Unauthenticated requests are rate-limited to **60/hour per IP** — every SSR render, cache miss, and preview refresh eats from that budget. The code already checks for `process.env.GITHUB_TOKEN` but no such secret is set, so requests go out anonymously and eventually 403.

Symptoms match: `throw new Error(\`Content list ${res.status} for /${path}\`)` is the only place that string is produced, and it fires the moment GitHub returns 403.

Also, the current in-memory cache only stores **successful** bundles for 10 minutes. When the API 403s, `useContent` gets `{ items: [], error: "..." }` and next render tries the API again — no back-off, no stale fallback.

## Plan

### 1. Add a GitHub token (recommended, fixes it long-term)

Ask the user to create a GitHub Personal Access Token (fine-grained, read-only "Contents" access to `EconomicMobilityCenter/EMC-Support-Resources`) and store it as a secret named `GITHUB_TOKEN`. Authenticated GitHub API allows **5,000 requests/hour**, and the code already sends `Authorization: Bearer ${GITHUB_TOKEN}` when the env var exists.

I'll use `add_secret` to collect it from the user securely.

### 2. Resilient caching (fixes the "everything blanks out" symptom)

Modify `getContentBundleForServer()` in `src/lib/content.functions.ts`:

- Track the last **successful** bundle separately from the timed cache.
- On fetch failure (or bundle with `error`), return the last successful bundle if we have one, with the error message attached so the UI can still show a warning banner. Otherwise return the empty error bundle as today.
- On success, refresh both caches.
- Add a short negative-cache window (~60s) after a failure so we don't hammer GitHub while rate-limited.

This keeps the Training page working through transient 403s and lets the token fix, once added, restore normal operation on the next cache refresh.

No changes to hooks, RLS, or Supabase — this is a pure content-fetching resilience fix.

## Files

- `src/lib/content.functions.ts` — cache logic + negative-cache handling.
- Secret: `GITHUB_TOKEN` (via `add_secret`).

## Verification

- Set `GITHUB_TOKEN`, reload `/training?org=<known-org>`. Content renders.
- Simulate failure by using an invalid token or without a network path — the page still shows the last-known content and a non-blocking error message rather than "No training material available".
