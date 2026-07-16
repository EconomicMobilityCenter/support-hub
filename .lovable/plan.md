# Preserve `?org=` param across navigation

## Problem

The Training page reads `?org=<id>` from the URL to decide which items to show. When the user clicks a nav link (Training, Get help, or the EMC logo), TanStack Router's `<Link>` does NOT carry existing search params along by default, so `?org=…` gets dropped and the user is treated as the "public" org. With no public items configured, the page renders "No training material available for your organization yet."

Confirmed by the session replay: the user opened Training with content, clicked "Get help", then clicked "Training" in the header — `?org=` was gone and content disappeared. The Vite hydration warning in the console is unrelated (it's a Grammarly extension attribute mismatch).

## Fix

Add `search={(prev) => prev}` to every internal `<Link>` in the header and home page so the current search params (specifically `org`) travel with each navigation.

### Files

- `src/components/site-header.tsx` — three `<Link>`s: logo (`to="/"`), Training, Get help.
- `src/routes/index.tsx` — two `<Link>`s (`to="/training"`, `to="/get-help"`).

No other logic changes. `useOrg` and content filtering stay as-is.

## Verification

1. Load `/training?org=<known-org>` — content shows.
2. Click "Get help" → URL becomes `/get-help?org=<known-org>`.
3. Click "Training" → URL becomes `/training?org=<known-org>` and items still render.
4. Load `/training` with no `?org=` → still shows "No training material available" (correct public behavior).
