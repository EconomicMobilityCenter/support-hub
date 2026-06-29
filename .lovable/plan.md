## Diagnosis

GitHub is still connected — the repo `EconomicMobilityCenter/EMC-Support-Resources` is reachable. The problem is that **the repo was reorganized** and `src/lib/content.functions.ts` is still looking at the old (flat) layout, so it returns 0 items and 0 orgs. That's why on `/?org=garland-isd` the partner shows but the products list / dropdowns are empty.

**Old layout (what the loader expects):**
```text
/<slug>.md
/orgs.json
/README.md
```

**New layout (what the repo actually has now):**
```text
/Configuration/orgs.json
/Configuration/feedback-routing.json
/Products/CCMR-WW/ccmr-faqs-md
/Products/CCMR-WW/ccmr-intro-video.md
/Products/CCMR-WW/ccmr-one-page-orientation.md
/Products/CCMR-WW/ccmr-tab-reference-guide.md
/README.md
```

So `GET /contents?ref=main` now returns only `Configuration/`, `Products/`, `README.md` — no `.md` files at the root and no `orgs.json` at the root → `items: []`, `orgs: {}`.

## Fix

Edit `src/lib/content.functions.ts` only. No other files touched.

1. **Load orgs from the new path.** Change the orgs.json fetch URL to `https://raw.githubusercontent.com/EconomicMobilityCenter/EMC-Support-Resources/main/Configuration/orgs.json`.

2. **Recursively walk `Products/`** (and keep tolerating any future root-level `.md` files):
   - List `/contents?ref=main`.
   - For each entry: if `type === "file"` and (ends with `.md` or matches the existing `ccmr-faqs-md` exception), fetch via raw; if `type === "dir"` and the directory is `Products` (or any directory other than `Configuration`), recurse one level into it and apply the same file rule. One level of recursion is enough for the current `Products/<product>/<file>.md` shape; we can deepen later if needed.
   - Keep `SKIP` for `README.md`. We no longer need to skip `orgs.json` at the root since it isn't there.
   - Slug stays as the filename without `.md` / `-md` suffix (unchanged), so existing content keys keep working.

3. **Cache + error handling unchanged.** Still 10-min in-memory cache, still returns `{ items: [], orgs: {}, error }` on failure.

4. **No schema, no UI, no route changes.** `useOrg`, `useContent`, the home page, and the Get Help form already consume `ContentBundle` correctly — they just need the loader to actually return data.

### Files touched
- edit `src/lib/content.functions.ts`

### Verification
After the edit: reload `/?org=garland-isd`. The server function response should include `garland-isd` in `orgs` with `products: ["ccmr-weekly-workbook"]`, and `items` should contain the four CCMR-WW entries. The "Your products" card and the Get Help product dropdown should populate.

### Not in scope
- The "Feedback and Requests" Google Sheets work from the prior turn is unaffected.
- I'm not changing how products are declared in `src/lib/products.ts` — `ccmr-weekly-workbook` is already in the catalog.
