## Hero band

Edit `src/routes/index.tsx` only.

1. Remove the outer `max-w-3xl` wrapper's responsibility for the hero. Restructure the page as:
   - A full-width `<section>` with `bg-[#C2EBFF]` and `py-20` (≈80px top/bottom).
     - Inside: a centered `max-w-3xl mx-auto px-6` container holding the existing `<h1>` "How can we help?" and the subtext `<p>`.
     - `<h1>` becomes `text-center font-extrabold text-[#003291]` (Open Sans ExtraBold via global font).
     - Subtext gets `text-center`.
   - Below the band: existing `max-w-3xl mx-auto px-6 py-12 space-y-10` container holding the three tiles and the "Your products" section unchanged (white page background).

2. No changes to colors, text, or layout of the tiles, products section, header, or any other route. No search bar (per user choice).

3. No CSS token or theme changes — colors are inlined per spec (`#C2EBFF`, `#003291`).