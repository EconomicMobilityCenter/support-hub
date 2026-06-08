## GitHub-backed Training content

### 1. Fetch layer (server-side, cached)

Add `src/lib/content.functions.ts` with a `createServerFn` `getContent` that returns `{ items: ContentItem[], orgs: Record<string, OrgConfig> }`.

- Inside `.handler()`:
  1. `GET https://api.github.com/repos/EconomicMobilityCenter/support-hub/contents/content` (header `Accept: application/vnd.github+json`, plus `Authorization: Bearer ${process.env.GITHUB_TOKEN}` only if the env var is set — never required, never client-side).
  2. For each entry where `name.endsWith(".md")`, fetch `https://raw.githubusercontent.com/EconomicMobilityCenter/support-hub/main/content/<name>`.
  3. Fetch `https://raw.githubusercontent.com/EconomicMobilityCenter/support-hub/main/config/orgs.json` once.
  4. Parse YAML frontmatter (`---\n...\n---\n<body>`) with a small inline parser (no new dep needed: split on `/^---\s*$/m`, parse the block with `js-yaml`). Add `js-yaml` + `@types/js-yaml`.
  5. Return plain DTOs: `{ slug, title, category, group, order, type, orgs, published, link?, body }`.
- Cache in a module-level `let cache: { data, expiresAt } | null` with ~10 min TTL so the Worker reuses results across requests within an instance. Fetch happens lazily on first call, not at module load.
- On fetch failure return `{ items: [], orgs: {}, error: "..." }` so the page still renders.

### 2. Client cache (one fetch per session)

Add `src/hooks/use-content.ts` using TanStack Query:
```ts
useQuery({ queryKey: ["content"], queryFn: () => fetchContent(), staleTime: Infinity, gcTime: Infinity })
```
The existing `QueryClient` lives for the session, so the result is reused across tab navigation without refetching.

### 3. Org context from URL

Update `src/hooks/use-org.ts` to source org from `?org=` against the fetched `orgs.json` (replace the current Supabase-backed `getOrg`). The `org` search param is already retained globally via `retainSearchParams(["org", "product"])` in `__root.tsx`, so it persists across tab navigation. If the param is missing or not in `orgs.json`, treat current org as `"public"`.

Return shape: `{ orgId: string, org: OrgConfig | null }` where `orgId` defaults to `"public"`.

### 4. Training tab rewrite

Replace `src/routes/training.index.tsx` body:

- Use `useContent()` + `useOrg()`.
- Filter items: `category === "Training"` AND `published !== false` AND (`orgs.includes(orgId)` OR `orgs.includes("all")`).
- Group by `group` field. Sort items inside each group by `order` asc.
- Render each group with shadcn `Collapsible` (already in project) — header is the group name, chevron icon, **collapsed by default**.
- Inside each group, list items by `title`:
  - `type: "video"` or `type: "document"` → render as `<a href={link} target="_blank" rel="noreferrer noopener">`.
  - `type: "article"` → button that toggles inline expansion below the title, rendering the markdown body. Use `marked` (add dep) + `DOMPurify` (add dep) to convert to sanitized HTML, rendered with `dangerouslySetInnerHTML` inside a `prose` wrapper. Article links do not navigate.
- Remove the old `/training/$slug` route file and the stale `src/lib/training-content.ts` import. Leave `training.$slug.tsx` deletion in the implementation step (it referenced the now-removed registry).
- Empty state: "No training material available for your organization yet." Loading: skeleton list. Error (from content fetch): inline message.

### 5. Header / home / other tabs

No changes to `site-header.tsx`, `routes/index.tsx`, `report-issue`, `support`, or styles. Home page still uses `useOrg()` — its `org.name` access keeps working since `OrgConfig` will expose `name`.

### Technical notes

- New deps: `js-yaml`, `@types/js-yaml`, `marked`, `dompurify`, `@types/dompurify`. All Worker-safe (pure JS).
- No GitHub token in client bundle. The serverFn handler is the only place that could read `process.env.GITHUB_TOKEN`, and it is optional.
- Files added: `src/lib/content.functions.ts`, `src/hooks/use-content.ts`.
- Files edited: `src/hooks/use-org.ts`, `src/routes/training.index.tsx`.
- Files deleted: `src/routes/training.$slug.tsx`, `src/lib/training-content.ts` (no longer referenced).
- Note: The repo `EconomicMobilityCenter/support-hub` currently returns 404 for `/content` and `/config/orgs.json`. The Training tab will render the empty state until that repo/path is populated; the code will work as soon as content is added.
