## Problem

Chrome is blocking the inline PDF. `<object>`/`<iframe>` embeds of raw PDFs from third-party CDNs (jsDelivr) are increasingly refused by Chrome — you get "This page has been blocked by Chrome" with no way to override it from our side. The URL works when opened in a new tab, but not inside a frame.

## Fix

Render the PDF with **PDF.js** (Mozilla's JavaScript renderer) instead of relying on Chrome's built-in frame viewer. PDF.js downloads the PDF via `fetch` and paints it to a `<canvas>`, so Chrome's frame-embedding policy doesn't apply. jsDelivr already sends `Access-Control-Allow-Origin: *`, so the fetch works.

### Approach

Install `react-pdf` (thin React wrapper around `pdfjs-dist`) and render pages inside the existing training dialog.

- `bun add react-pdf pdfjs-dist`
- New component `src/components/pdf-viewer.tsx`:
  - `<ClientOnly>` wrapper (pdfjs touches `window`, must not run in SSR).
  - Loads worker from `pdfjs-dist` via `?url` import.
  - Uses `<Document file={url}>` + a `<Page>` per page, sized to container width.
  - Loading + error states; "Open PDF in new tab" fallback link.
- `src/routes/training.index.tsx`:
  - Replace the string-based `pdfEmbedHtml()` + `dangerouslySetInnerHTML` path for PDFs with a real React render. Detect PDFs in the active item and render `<PdfViewer url={...}>` above the sanitized markdown instead of injecting `<object>` HTML.
  - Drop the `object`/`data`/`type` additions to DOMPurify and the `raw.githubusercontent.com` / `cdn.jsdelivr.net` iframe allow-list entries (no longer needed for PDFs — video hosts stay).
  - Keep the markdown-embedded PDF case (`<img src="*.pdf">` or solo `<a href="*.pdf">`) working by swapping those nodes for a placeholder element (e.g. `<div data-pdf-url="...">`), then, after render, mounting `<PdfViewer>` into each placeholder via a small effect — or, simpler, extract all PDF URLs from the markdown up front and render them as `<PdfViewer>` components alongside the sanitized HTML.

### Files touched

- `src/components/pdf-viewer.tsx` (new)
- `src/routes/training.index.tsx`
- `package.json` / lockfile (via `bun add`)

## Result

PDFs render inline via canvas, so Chrome's frame-blocking heuristic doesn't apply. Works for any PDF URL that sets CORS (jsDelivr does). The "Open PDF in new tab" link remains as a fallback.
