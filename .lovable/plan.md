# Open workbooks in a new full-page tab

Right now clicking a product on the landing page goes to an in-app page that shows the workbook inside a framed viewer. Instead, clicking a product will open the workbook itself directly in a new browser tab, using the full screen with no portal chrome around it.

## Behavior

- Product with a configured workbook URL: opens that URL in a new tab (`target="_blank"`, `rel="noopener noreferrer"`). The support portal stays open in the original tab.
- Product with no configured URL: stays in-app and shows the existing "No workbook link" message with the contact-support link, so nothing silently fails.

## Technical notes

- `src/routes/index.tsx`: product list items become a plain anchor to `productUrls[slug]` with `target="_blank"` when a valid `https://` URL exists; otherwise keep the current `Link` to `/workbook` (which renders the no-link fallback).
- `src/routes/workbook.tsx`: kept as the fallback/no-link page; no layout changes needed.
