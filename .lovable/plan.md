## Blocker first: `Configuration/orgs.json` is currently invalid JSON

I fetched the live file. The `dallas-college` block has three problems, and because the whole file fails to parse, **every** org (including `garland-isd` and `public`) falls back to an empty org map:

```json
"products": ["enrollment-pipeline-navigator"]   <- missing comma
"productURLs": {
    "enrollment-pipeline-navigator": ""https://...&amp;action=embedview..."   <- doubled quote
}
```

Please fix it in GitHub to:

```json
"dallas-college": {
  "displayName": "Dallas College",
  "products": ["enrollment-pipeline-navigator"],
  "productUrls": {
    "enrollment-pipeline-navigator": "https://netorgft3058149.sharepoint.com/sites/EMCProducts/_layouts/15/Doc.aspx?sourcedoc={b9511843-1036-4737-86f7-5c58cbac6bb7}&action=embedview&AllowTyping=True&wdHideGridlines=True&wdHideHeaders=True&wdDownloadButton=True&wdInConfigurator=True&edaebf=rslc0"
  }
}
```

(One comma added, the extra `"` removed. I'll also make the code tolerant of `productURLs` casing and of `&amp;` entities so a small typo doesn't break the link.)

## What I'll build

### 1. Read `productUrls` from org config
In the content loader, extend the org shape with `productUrls: Record<string, string>`, accepting either `productUrls` or `productURLs`, trimming stray quotes/whitespace, and decoding `&amp;` → `&` so SharePoint embed URLs survive.

### 2. New viewer route `/workbook`
A route at `/workbook?url=<encoded>&org=...&product=...` that:
- Renders the workbook URL in a full-height iframe (SharePoint embed URLs are designed for this).
- Shows a clear "No workbook link is configured for this product yet — contact support" state when `url` is empty or missing.
- Has a back link to home that preserves `?org=`, plus its own page metadata.

### 3. Make the product cards on the home page clickable
Each item in "Your products" becomes a link/button that resolves `orgs[org]?.productUrls?.[slug]` and navigates to `/workbook` with `url` set to the encoded link (empty string when absent, so the viewer's own message shows). Cards get hover/focus styling and keyboard support.

## Technical notes
- Uses TanStack `<Link to="/workbook" search={...}>` rather than `window.location.href`, so it stays a client-side navigation and keeps `?org=` context; the effect is identical to the snippet you shared.
- `validateSearch` with a plain-string `fallback` for `url`, so a missing/odd param never throws.
- Server-side content cache is 10 min; after the orgs.json fix a refresh (or a code deploy) picks it up.

## Out of scope
- No auth gating on the workbook URL (anyone with the org link can view it, same as today's content model).
- No workbook links for other orgs until you add `productUrls` entries for them.
