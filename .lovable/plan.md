## Changes to `src/components/get-help-form.tsx`

1. **Relabel the severity question** from "Is this issue blocking you from certain tasks?" to **"How is this affecting your work?"** (used in both Option B and Option C blocks).

2. **Replace the four severity options** in `SEVERITY_OPTIONS`:
   - `nice_to_have` → "Minor — something looks off, but I can keep working"
   - `workaround` → "Moderate — I can work around it for now"
   - `blocking` → "Major — I'm stuck on something I need to do"
   - `urgent` → "Critical — this is stopping multiple people from working"

   Severity enum values (`nice_to_have | workaround | blocking | urgent`) stay the same so the backend / `SubmissionInput` type is untouched — only the display labels change.

3. **Remove the "Do you need this data by a specific date?" field** from both Option B and Option C blocks. This includes:
   - Removing the `neededByDate` state and `setNeededByDate` setter
   - Removing the two `DatePickerField` blocks for "needed by" date
   - Removing the `details.neededByDate = ...` writes in `buildPayload` for both B and C

No other files need to change. Backend schema and submission payload shape remain compatible (the `neededByDate` key in `details` was optional).
