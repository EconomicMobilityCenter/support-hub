## Problem

`ccmr-intro-video.md` contains a Vimeo `<iframe>` embed in its body. The training renderer pipes the markdown HTML through DOMPurify with default settings, which strips all `<iframe>` tags (and the `<script>` tag). Result: the expander opens but the embed area is empty.

## Fix

Update `renderMarkdown` in `src/routes/training.index.tsx` so DOMPurify keeps safe video iframes while still blocking everything else.

Configure DOMPurify with:
- `ADD_TAGS: ["iframe"]`
- `ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "referrerpolicy", "title"]`
- A `uponSanitizeElement` hook that drops any `<iframe>` whose `src` host is not on an allowlist: `player.vimeo.com`, `www.youtube.com`, `youtube.com`, `www.youtube-nocookie.com`, `youtube-nocookie.com`.
- Leave `<script>` blocked (default behavior) — the Vimeo `player.js` script in the markdown is not needed for playback.

Also add a small `.prose iframe` style (or inline wrapper rule) so embeds fill the available width with a 16:9 aspect ratio, since the source uses a `padding-top` wrapper that already handles that — no extra CSS needed beyond making sure `iframe` isn't constrained by `prose`.

## Out of scope

- No changes to the markdown file format or to how non-video items render.
- No change to `type: "video"` handling beyond what's needed for embedded HTML to display; future work could auto-render from the `link` field, but the user's current file uses an inline iframe so the sanitizer fix is sufficient.
