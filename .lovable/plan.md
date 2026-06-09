## Goal

Replace the nested collapsible-in-collapsible pattern on `/training` with a cleaner list + modal pattern. Articles open in a centered, scrollable dialog instead of expanding inline.

## Current behavior

`src/routes/training.index.tsx` renders each group as a `Collapsible`, and inside each group every article is an `ArticleItem` with its own toggle that expands the markdown body inline. Result: once a few are open the page is a wall of expanded content with no obvious way to close them.

## Proposed behavior

- Groups stay as `Collapsible` sections (one level only) so users can scan categories.  
- if there are less than 5 collapsible groups they should be expanded upon page load
- Inside a group, each article is a plain link/button. Clicking it opens a `Dialog` modal.
- Modal contains:
  - Article title as `DialogTitle`
  - Scrollable body (max-height ~80vh, `overflow-y-auto`) with the same `prose prose-sm max-w-none` markdown rendering already in use
  - Clear close affordance (the built-in `X` in `DialogContent` plus click-outside / Esc)
- Only one article open at a time → much less visual noise, obvious how to dismiss.

## Implementation details (single file: `src/routes/training.index.tsx`)

1. Remove the `ArticleItem` inline-expand component.
2. Add local state for the currently-open article: `const [active, setActive] = useState<ContentItem | null>(null)`.
3. Replace each `<li>` content with a button that calls `setActive(it)`; keep the existing navy link styling.
4. Render a single `<Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>` at the bottom of the component.
  - `DialogContent` with `max-w-3xl max-h-[85vh] flex flex-col`
  - `DialogHeader` → `DialogTitle` with `active?.title`
  - Body: `<div className="overflow-y-auto pr-2"><div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={...} /></div>`
  - Markdown rendering uses the existing `renderMarkdown` helper (marked + DOMPurify with the iframe allowlist) — unchanged.
5. Keep the group-level `Collapsible` behavior exactly as-is.

## Out of scope

- No content changes, no routing changes, no business logic, no email/auth work.
- FAQ page is not touched in this step; if it has the same issue we can mirror the pattern in a follow-up — confirm if you want it included now.