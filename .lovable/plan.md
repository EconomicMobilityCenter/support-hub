# Fix inline PDF rendering + enlarge the modal

## Problem

Two issues to resolve together on the Training page PDF modal:

1. **PDF still shows "Couldn't load PDF."** The earlier console error was a worker/API version mismatch (`react-pdf` bundles pdfjs API 5.4.296, but we had `pdfjs-dist@6.1.200` installed, so the worker was v6 and failed to load). Worker version now aligned to 5.4.296, but a Playwright check found no `<canvas>` rendered — likely the `<Document file={url}>` string form triggers pdf.js to fetch from within the worker, which can still fail on cross-origin/redirect edge cases. Fetching the PDF ourselves and passing an `ArrayBuffer` to `<Document>` is more reliable.
2. **Modal is too narrow for a full letter-size PDF page.** Currently `max-w-3xl` (~48rem). PDFs render squeezed, especially multi-page docs.

## Changes

### 1. `src/components/pdf-viewer.tsx`
- Fetch the PDF as an `ArrayBuffer` in an effect (with abort controller), then pass `{ data }` to `<Document>`. This avoids pdf.js's internal fetch, sidesteps CORS/redirect quirks, and gives us a clean error state we can surface.
- Keep the existing `ClientOnly` wrapper, `ResizeObserver` width tracking, and "Open PDF in new tab" fallback link.
- Show a clearer inline error message if the fetch fails ("Couldn't load PDF (network). Open in new tab below.").

### 2. `src/routes/training.index.tsx`
- Widen the dialog: swap `max-w-3xl` for `max-w-5xl` (or `sm:max-w-[900px]`) and keep `max-h-[85vh]` with the inner scroll container. This gives ~900px of usable width so a rendered PDF page is close to actual size.
- No other logic changes; PDF extraction, markdown rendering, and the video-iframe allowlist stay as-is.

## Technical notes

- `pdfjs-dist` is pinned to `5.4.296` to match what `react-pdf@10.4.1` expects; do not bump.
- Worker is loaded via `import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"` — Vite serves it as a static asset, avoiding CDN version drift.
- `<Document file={{ data: arrayBuffer }} />` is the recommended form when the caller owns the fetch.

## Verification

- Reload `/training`, open "One-Page Orientation".
- Expect: a rendered PDF page (`<canvas>`) inside a wider modal, plus the "Open PDF in new tab" link below.
- Confirm via Playwright: `document.querySelectorAll('canvas').length >= 1` inside the dialog.
