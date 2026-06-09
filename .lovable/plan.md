# Fix markdown formatting in Training dropdowns

## Problem
`src/routes/training.index.tsx` renders each article body with `marked` + DOMPurify into a `<div class="prose prose-sm">`. The `prose` classes come from the Tailwind Typography plugin, which is **not installed or registered** in this project. Result: headings, bullet lists, and paragraphs from the GitHub `.md` files all collapse into an unstyled wall of text.

## Fix
1. Install `@tailwindcss/typography` as a dev dependency (`bun add -d @tailwindcss/typography`).
2. Register it in `src/styles.css` using the Tailwind v4 syntax: add `@plugin "@tailwindcss/typography";` near the top with the other Tailwind directives.
3. Keep the existing `prose prose-sm max-w-none` className on the article body container so headings, lists, links, and code render with proper spacing/bullets.
4. (Light polish) Tighten the prose color to match the page palette by adding a small style override in `styles.css` so headings use the same navy as the rest of training (e.g. `.prose :where(h1,h2,h3,h4):not(:where([class~="not-prose"] *)) { color: #00005c; }`).

No content/business logic changes — purely presentation.

## Files
- `package.json` (added dep via bun)
- `src/styles.css` (register plugin + minor color override)

## Verification
Open `/training?org=garland-isd`, expand the One-page orientation and FAQ items, and confirm headings, bullet lists, and paragraph spacing render the same way the files preview on GitHub.