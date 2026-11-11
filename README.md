# ÉcoleLien

Interactive prototype of a school–family app for Senegal: parents, students, teachers and school leadership in one place.
All data is fictitious (pilot school "Groupe scolaire pilote Malika Plage"). No message, payment or SMS is ever sent.

## Test online
- Preview with the four accounts: `index.html`
- App only: `app.html`
- Facilitator mode with test tasks per role: `app.html?animateur=1`

## Live testing (Firebase Realtime Database)
The database address is in `config.js`. Its security rules are in `database.rules.json`:
paste them in the Firebase console → Realtime Database → Rules → Publish.

**Demo room (several phones, one school).** In facilitator mode, tap *Créer une salle*,
then *Copier le lien* and send it to the test phones (`app.html?salle=1234`).
Every phone keeps its own account (parent, teacher…) and sees the same fictitious school live:
announcements, confirmations, messages, roll call, payments. Participants can also join from
Menu → *Rejoindre une salle de démo*. Without a room the app works exactly as before, on the phone only.

**Test sessions (pilot results).** In facilitator mode, tap *Démarrer une séance*
(participant code only — no names or phone numbers), start each task, mark it
*Seul* / *Aide* / *Échec*, then *Terminer* with confidence (1–5) and notes.
App actions are logged automatically. Results and CSV export: `resultats.html`.

## Run locally
Open a terminal in this folder and run `python -m http.server 8000`, then go to http://localhost:8000
(on Windows, double-click `tools/serve-windows.bat`).

## Files
- `index.html` preview page, `app.html` the app
- `app.js`, `screens.js`, `location.js` base prototype; `merge.js` / `merge.css` pilot improvements
- `live.js`, `live.css`, `config.js` demo room and test sessions; `resultats.html` pilot results
- `pwa.js`, `sw.js`, `manifest.webmanifest` installable web app and offline cache
- `database.rules.json` Realtime Database security rules

Internal pilot material (pricing guide, economics model, backlog) is kept outside this public repository.
