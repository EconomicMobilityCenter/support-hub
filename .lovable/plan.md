## Goal

A support website linked from your native Excel products via `?org=<id>`. The org parameter:
- Filters which products' documentation is visible
- Autofills form fields on issue/support requests
- Falls back to a generic public view when missing/unknown

## Pages & routes

```
/                          Landing (overview + nav)
/training                  Index of training material (filtered by org entitlements)
/training/$slug            Individual training article (MDX)
/report-issue              Bug/issue report form
/support                   General support request form
/admin/submissions         Internal view of submitted forms (auth-protected)
```

Org param is read once, stored in URL search params on every navigation (via TanStack search middleware `retainSearchParams(['org'])`), and surfaced through a small `useOrg()` hook.

## Org resolution

- On first load, read `?org=` from URL.
- Call a server function `getOrg(orgId)` that proxies to your external API (URL configured via env var `ORG_API_URL`, optional `ORG_API_KEY`).
- Returns: `{ id, name, contactName?, contactEmail?, products: string[] }` or `null`.
- Stub the external call initially — returns mock data for a few sample orgs so you can develop end-to-end. Easy to swap when your API is ready.
- Result cached via TanStack Query for the session.
- Unknown/missing org → treated as "public visitor": full catalog shown, no autofill, a subtle banner noting limited personalization.

## Content (training materials)

- MDX files in `src/content/training/*.mdx`.
- Frontmatter: `title`, `description`, `products: string[]`, `order?`.
- A build-time loader (Vite glob import) compiles them into a typed index.
- `/training` filters articles whose `products` intersects the org's entitlements (or shows all when public).
- Article page renders MDX with the existing shadcn typography styles.

## Forms

Two forms with shared structure; both:
- Autofill `name`, `email`, `company`, `productAffected` (from org context) when available.
- Validate with Zod (client + server).
- Submit via `createServerFn` → insert into Lovable Cloud DB → trigger app email to your support inbox.

**Report Issue fields:** product, severity, summary, steps to reproduce, expected vs actual, attachments-as-links (no file upload in v1), contact info.

**Get Support fields:** product, topic/category, message, contact info.

## Database (Lovable Cloud)

```
support_submissions
  id uuid pk
  type text check ('issue' | 'support')
  org_id text
  org_name text
  payload jsonb        -- all form fields
  status text default 'new'
  created_at timestamptz default now()
```

RLS: insert open to anon (forms are public-ish, gated by org link), select restricted to an `admin` role (separate `user_roles` table + `has_role()` per Lovable conventions).

## Notifications

Lovable's built-in app emails. One template `new-submission` sent on each insert to a configurable `SUPPORT_INBOX` address.

## Admin

`/admin/submissions` — minimal table view (date, type, org, summary, status). Auth via Lovable Cloud + role check. You can manage admin users via a small `user_roles` admin in a follow-up if needed.

## URL contract for your Excel team

```
https://<your-domain>/training?org=acme-123
https://<your-domain>/report-issue?org=acme-123&product=invoicer
https://<your-domain>/support?org=acme-123
```

`product` is optional; if passed, it pre-selects in the form.

## What I'll need from you (later, not blocking)

1. The org API endpoint + auth scheme when ready (I'll stub until then).
2. The destination email for support notifications.
3. A few real training MDX articles (I'll seed with placeholders for each product category you name).

## Tech notes

- TanStack Start file routes; `retainSearchParams(['org','product'])` so `?org=` survives navigation.
- MDX via `@mdx-js/rollup` + Vite glob import; typed registry.
- `createServerFn` for `getOrg`, `submitForm`. External org-API call lives server-side only.
- Lovable Cloud enabled for DB, auth (admin), and app emails.

## Out of scope for v1

- File attachment uploads on forms (use links instead).
- Multilingual content.
- Full-text search across docs (can add later via a simple client-side index).
