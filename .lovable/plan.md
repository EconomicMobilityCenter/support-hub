## Problem

The Training page filters items by `it.orgs.includes(orgId)`, but the GitHub content uses `orgs: ["all"]` on every article plus a separate `product:` frontmatter field (e.g. `product: "ccmr-weekly-workbook"`). Because every item matches `"all"`, Dallas College (entitled only to `enrollment-pipeline-navigator`) still sees CCMR Weekly Workbook articles.

The org → product entitlements already live in `Configuration/orgs.json` on GitHub, so no app-side changes are needed when new orgs/products are added — we just need to actually honor those entitlements.

## Fix

Update `src/routes/training.index.tsx` visibility logic to filter by the item's `product` field against the current org's `products` list:

- Add `product?: string` to `ContentItem` in `src/lib/content.functions.ts` and parse it from frontmatter.
- In Training's `groups` memo, keep items when:
  - `it.published !== false` AND `it.category === "Training"`, AND
  - org's `products` contains `"all"` (internal/admin view), OR
  - `it.product` is in org's `products`, OR
  - item has no `product` field AND `it.orgs` includes the current `orgId` or `"all"` (backward-compat for content that hasn't been tagged with a product yet).
- For the `public` fallback (no `?org=` on URL), use the `public` org's `products` from `orgs.json` (already lists both products), so unlinked visitors see everything published.

## Result

- `/training?org=dallas-college` → only EPN articles.
- `/training?org=garland-isd` → only CCMR Weekly Workbook articles.
- `/training?org=internal` → all articles.
- `/training` (no org) → both products (driven by the `public` entry in `orgs.json`).
- Adding a new org + product mapping in GitHub `Configuration/orgs.json` + tagging content with `product:` is sufficient — no app redeploy needed.

## Files touched

- `src/lib/content.functions.ts` — add `product` to `ContentItem` and parse it.
- `src/routes/training.index.tsx` — replace the `orgs`-based filter with the product-entitlement filter above.
