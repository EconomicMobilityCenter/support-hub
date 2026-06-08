## Header layout tweak

**File: `src/components/site-header.tsx`**

1. Restructure the header flex container so the logo+brand stays on the left, and the nav links (`Training`, `Get Help`) move to the right, sitting immediately to the left of the user info block.
   - Replace the current three-column `justify-between` layout with: left = logo/brand; right = a single flex group containing nav links + user info, separated by a small gap (or a thin vertical divider).
2. Update the user info block: when `orgId` is set but `org` is null (unknown org), render "Public user" instead of "Unknown org / Showing public content". When no `orgId` at all, also show "Public user" (currently shows nothing) — to confirm: see question below.

No other files change. No business logic changes.