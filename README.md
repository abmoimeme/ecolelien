# ÉcoleLien

Interactive prototype of a school–family app for Senegal: parents, students, teachers and school leadership in one place.
All data is fictitious (pilot school "École pilote Malika Plage"). No message, payment or SMS is ever sent.

## Test online
- Preview with the four accounts: `index.html`
- App only: `app.html`
- Facilitator mode with test tasks per role: `app.html?animateur=1`

## Run locally
Open a terminal in this folder and run `python -m http.server 8000`, then go to http://localhost:8000
(on Windows, double-click `tools/serve-windows.bat`).

## Files
- `index.html` preview page, `app.html` the app
- `app.js`, `screens.js`, `location.js` base prototype; `merge.js` / `merge.css` pilot improvements
- `pwa.js`, `sw.js`, `manifest.webmanifest` installable web app and offline cache

Internal pilot material (pricing guide, economics model, backlog) is kept outside this public repository.
