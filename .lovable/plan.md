## Repoint content fetch to `EMC-Support-Resources`

The new repo stores Markdown files and `orgs.json` at the repo **root** (no `content/` or `config/` subfolders). One file is also misnamed `ccmr-faqs-md` (missing the dot).

### Change: `src/lib/content.functions.ts`

Update the two constants and the three URLs the handler builds:

- `const REPO = "EconomicMobilityCenter/EMC-Support-Resources";`
- List call: `GET /repos/${REPO}/contents?ref=${BRANCH}` (root, no `/content`).
- Per-file raw fetch: `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${name}` (no `content/` prefix).
- `orgs.json` raw fetch: `https://raw.githubusercontent.com/${REPO}/${BRANCH}/orgs.json` (no `config/` prefix).

Filter the listing to `type === "file"` AND (`name.endsWith(".md")` OR `name === "ccmr-faqs-md"` — tolerate the missing dot so that file still loads). Continue to skip `README.md` and any non-content files: explicitly exclude `name === "README.md"` and `name === "orgs.json"`.

No other code changes — `useContent`, `useOrg`, and `training.index.tsx` already consume the same `ContentBundle` shape. After the in-memory cache TTL (10 min) elapses or the server restarts, the Training tab will populate from the new repo.

### Verification

1. After edit, hit the running server function and confirm `items.length > 0` and `orgs` is populated.
2. Open `/training` and confirm groups render with the items from the five Markdown files. Empty state should be gone.

### Open question

The file `ccmr-faqs-md` is missing the `.md` extension on GitHub. The plan is to tolerate it in the loader, but the cleaner fix is renaming it in the repo to `ccmr-faqs.md`. Want me to just tolerate it (no repo change), or should you rename it on GitHub and I'll drop the special-case?