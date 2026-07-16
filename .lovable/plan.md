## Goal

When a training item's markdown references a PDF (either as `![...](...pdf)`, `[...](...pdf)`, or via the frontmatter `link:` field on a `type: "document"` item), render it inline inside the modal using an embedded PDF viewer instead of a broken image or a plain link.

## Changes

### 1. `src/lib/content.functions.ts` — resolve relative asset paths

When parsing each markdown file, capture the file's directory (e.g. `Products/EPN`) and rewrite relative markdown URLs to absolute `raw.githubusercontent.com` URLs so that `../Artifacts/EPN-Onepager.pdf` becomes a real URL the browser can load.

- Add a small helper that scans the body for `](./x)`, `](../x)`, and `](x)` where `x` doesn't start with `http`, `#`, `mailto:`, or `/`, and rewrites to `https://raw.githubusercontent.com/EconomicMobilityCenter/EMC-Support-Resources/main/<resolved-path>`.
- Apply to both image (`![...](...)`) and link (`[...](...)`) syntaxes.
- Also normalize the frontmatter `link` field the same way if it looks relative.

### 2. `src/routes/training.index.tsx` — embed PDFs in the modal

After `marked` + `DOMPurify` runs, post-process the sanitized HTML:

- Any `<img src="*.pdf">` → replace with an `<iframe>` (600px tall, full width) pointing at the same URL, plus a "Open PDF in new tab" link underneath as a fallback.
- Any `<a href="*.pdf">` where the anchor is the only content of its paragraph → same treatment (embed + fallback link).

Extend the DOMPurify allow-list to include iframes whose src host is `raw.githubusercontent.com` and `docs.google.com` (needed if we ever proxy through Google's viewer). Existing YouTube/Vimeo allow-list stays.

For items whose frontmatter is `type: "document"` with a `link` ending in `.pdf`, render the iframe directly in the modal (no need to rely on body markdown).

### 3. No GitHub changes required

Your existing `epn-one-pager.md` with `![Enrollment Pipeline One Pager](../Artifacts/EPN-Onepager.pdf)` will Just Work after this — the relative path resolves to the raw URL and the image tag gets swapped for an embedded PDF viewer.

## Result

Clicking "One-Page Orientation" opens the modal with the PDF rendered inline (scrollable), plus a small "Open in new tab" link for users who prefer that. Any future PDF you drop in `Artifacts/` and reference from a markdown file — relative or absolute — renders the same way automatically.

## Files touched

- `src/lib/content.functions.ts` — relative-URL rewriting during frontmatter parse.
- `src/routes/training.index.tsx` — PDF post-processing in `renderMarkdown` + iframe allow-list + `type: "document"` direct embed.
