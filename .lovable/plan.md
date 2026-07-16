I’ll fix the remaining 403 at the content-loader level, not just the training page filter.

Plan:
1. Update the GitHub content fetcher so a `403` on the root `/contents` listing does not make the whole app return no content.
2. Add a fallback fetch path that uses GitHub’s recursive tree endpoint, then downloads matching markdown/config files from raw URLs.
3. Keep the intended access behavior:
   - no `?org=` / public visitors see all published training material
   - org-specific visitors still get filtered by that org’s configured products
4. Improve the returned error message to include enough context if GitHub still rejects the request, without exposing the token.
5. Verify the `/training` page loads content without `?org=` and with `?org=internal`, and that the server function no longer returns `Content list 403 for /`.