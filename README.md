# MAGiC website

The public site for MAGiC — Marketers at Home Getting Coffee. One page: header, newsletter signup, session calendar, session recordings library, member directory, MAGiC Exchange, footer.

## Files

- `index.html` — the whole site: layout, styling, logic, and a built-in backup copy of sessions and members.
- `support.js` — the small runtime that renders `index.html`. Don't edit.
- `_ds/…/styles.css`, `_ds/…/_ds_bundle.js` — the Modernist design system (colors, type, buttons). Don't edit.
- `assets/` — logo and header images.
- `.nojekyll` — required so GitHub Pages serves the `_ds` folder. Don't delete.

No build step. Open `index.html` through any static server, or publish as-is.

## Where the content comes from

On every page load the site reads the **Magic Center** Google Sheet:

- **Approved Calendar** tab (gid 885042571) — sessions. Columns used: DATE, TOPIC, PRESENTER / ORCHESTRATOR, THEME, APPROVED THUMBNAIL (write-up), RECORDING, DECK.
- **Member Profiles** tab (gid 964518453) — directory. Columns used: FIRST, LAST, EMAIL, CITY, STATE, professional specialties, personal interests, COMPANY NAME, LINKEDIN PROFILE, and the expertise checkbox columns.

Tabs are read by gid, so renaming a tab is safe. Columns are matched by header text, so they can move. The sheet must stay shared as "Anyone with the link — Viewer".

If the sheet can't be reached, the site falls back to the backup copy embedded in `index.html` (`const SESSIONS` / `const MEMBERS`). Sheet values override the backup wherever the sheet has a value.

Upcoming vs. past is computed from today's date — no manual moving.

## Publishing on GitHub Pages

1. Push this folder to the root of a GitHub repo.
2. Repo → Settings → Pages → Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
3. The site appears at `https://<account>.github.io/<repo>/` within a minute or two. A custom domain can be added on the same screen.
