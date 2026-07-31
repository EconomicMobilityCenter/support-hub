## What I verified

In the live preview the app is fine: the stylesheet at `/src/styles.css` loads, 3 stylesheets are active, and the logo renders at 36px. Your screenshot shows the opposite — no CSS at all (raw serif text, full-size logo, underlined links), which means the built stylesheet asset didn't load on the preview URL you opened, not that the layout code is wrong.

I have not yet confirmed *why* the built asset fails, so step 1 of this plan is to confirm it rather than guess.

## Plan

1. **Reproduce the broken state against a production build**
   - Run the project's build and serve the output locally, load `/?org=dallas-college` in a headless browser, and record the `<link rel="stylesheet">` hrefs plus their HTTP status and content-type.
   - Compare with the dev server, where CSS currently resolves correctly.

2. **Fix based on what the build shows**
   - If the CSS asset 404s or is served as HTML: correct how `src/styles.css` is referenced in `src/routes/__root.tsx` (the `?url` import) so the emitted, hashed asset URL is used in the built output.
   - If the build fails or partially emits: fix the build error surfaced in step 1 (that would also explain the preview serving a stale/broken shell).
   - If the asset is fine and only the Google Fonts `<link>` fails: keep the font link but make sure it can't affect layout (the fallback stack in `src/styles.css` covers Open Sans).

3. **Verify**
   - Re-run the built-output check and confirm the navy header band, the blue hero, and the product cards render with the correct colors and `max-w-6xl` width.
   - Screenshot the built page at desktop width for a visual diff against the live preview.

## Notes

- No changes to content loading, org resolution, Jira/Slack, or the new `/workbook` route are part of this.
- If the root cause turns out to be a stale preview deployment rather than app code, I'll say so and recommend a fresh publish instead of changing code.
