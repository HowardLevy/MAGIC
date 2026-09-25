# Working on the MAGiC site

- The entire site is `index.html`. Edit it directly; no build.
- Styling is inline `style="…"` on each element, using the design-system variables (`var(--color-accent)` etc.). Keep it that way — don't add stylesheets or classes beyond the existing `btn`, `tag`, `input` ones.
- Template holes are `{{ name }}` lookups only — no expressions. Compute values in `renderVals()` inside the `class Component extends DCLogic` script near the bottom and expose them by name.
- Lists use `<sc-for list="{{ items }}" as="item">`, conditionals `<sc-if value="{{ flag }}">`.
- Content lives in the Google Sheet (see README). Prefer changing the sheet over hard-coding content. `const SESSIONS` / `const MEMBERS` are only an offline fallback.
- Sheet parsing: `sessionsFrom()` and `membersFrom()`. Expertise pill groups: `TAG_GROUPS` — names must match the Member Profiles column headers.
- Visual rules (Modernist): no rounded corners except the pill filters/search bar already in place, flush-left labels, accent #ec3013 (orange-red) used sparingly, blue #627CCC for expertise pills.
- Don't touch `support.js` or `_ds/`. Don't delete `.nojekyll`.
