## Fix

Google's viewer is unreliable for GitHub raw URLs (hence "No preview available"). Swap it for a native browser PDF embed pointing directly at the raw GitHub URL.

### `src/routes/training.index.tsx`

- Change `pdfEmbedHtml` to render:
  ```html
  <object data="<url>" type="application/pdf" style="width:100%;height:600px;...">
    <iframe src="<url>" style="width:100%;height:600px;border:0"></iframe>
  </object>
  <div><a href="<url>" target="_blank" rel="noopener noreferrer">Open PDF in new tab</a></div>
  ```
- Add `object` to DOMPurify's `ADD_TAGS` and `data`, `type` to `ADD_ATTR`.
- Drop `docs.google.com` from the iframe allow-list; keep `raw.githubusercontent.com` and the video hosts.
- Leave the iframe host-check hook as-is (it only affects `<iframe>`, not `<object>`).

## Result

The one-pager renders inline via the browser's native PDF renderer, which handles `raw.githubusercontent.com` directly. Fallback link stays for edge cases.

## File touched

- `src/routes/training.index.tsx`
