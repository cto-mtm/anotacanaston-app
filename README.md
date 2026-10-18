# Anota Canaston

A scorekeeper app for Canastón (house-rules Italian Canasta). Vue 3 + Vite +
TypeScript (strict) + Tailwind 4 + Pinia + vue-router with a View Transitions
wrapper + typed vue-i18n + Capacitor 7 (iOS/Android) + Firebase
Hosting/Functions, fully local-first with an offline emulator dev flow.

## What's in the box

- **`app/`** — Vue 3 + Vite + Capacitor web app
- **`firebase/`** — Firebase Hosting config + a tiny Cloud Functions API
  (`/health`, `/echo` — a demo endpoint only; the game itself is local-first)
- Full local dev via the Firebase Emulator Suite — no Firebase project, no
  login, no internet beyond `npm install`
- View-Transitions animation system (hero/shared-element morphs, page
  transitions, list animations) — see `docs/animations.md`
- vue-i18n wired in from day one (es authored, en fallback) — see `docs/i18n.md`

## Quick start — fully local, no Firebase account

```bash
npm i -g firebase-tools   # once, globally

cd firebase && npm install
cd functions && npm install && cd ..
npm run emulators                                # backend on :5001, offline demo-app project

# in a second terminal:
cd app && npm install
cp .env.example .env
npm run dev                                      # web app on :5173, pointed at the emulator
```

Visit `http://localhost:5173/about` — it should show a successful `/health`
response from the emulated function.

### Daily workflow (two terminals)

```bash
# terminal 1
cd firebase/functions && npm run build:watch     # hot-rebuilds functions on change
# terminal 2 (separate shell)
cd firebase && npm run emulators:watch
# terminal 3
cd app && npm run dev
```

## How to add a hero transition

See `docs/animations.md` for the full cookbook. Summary: give the source
element `:style="{ viewTransitionName: 'x-' + item.id }"`, give the matching
target element on the destination page the same name, done — the browser
morphs position/size automatically. Names must be derived from the item id
and unique per page.

## How to add a translated string / a new locale

See `docs/i18n.md`. Summary: add the key to both `es` and `en` in the
relevant `src/i18n/locales/**/*.ts` module in the same edit — `en` is typed
`typeof es`, so a missing key fails `tsc`.

## How to add an API endpoint

1. Add a schema to `firebase/functions/src/models.ts`.
2. Add a route branch in `firebase/functions/src/api.ts`.
3. Call it from the app via `apiFetch` (`app/src/lib/api.ts`).

Testable immediately against the running emulator.

## Going native

```bash
cd app
npm run build
npx cap add ios
npx cap add android
npm run cap:assets     # after dropping icon/splash sources into app/assets/
npx cap sync
npx cap open ios       # or: npx cap open android
```

The API CORS allow-list already includes the Capacitor origins
(`capacitor://localhost`, `http://localhost`), and the Android hardware/
gesture back button is already handled in `app/src/lib/native.ts`.

## Deploy

1. Set the real project id in `.firebaserc`.
2. Set `VITE_API_URL` for prod (in `app/.env` or your build environment).
3. `npm run deploy` (from the repo root — builds the app and runs
   `firebase deploy`; requires `firebase login`).

## Keeping dependencies fresh

Versions in `package.json` are pinned to the dates this boilerplate was
generated. They're intentionally NOT auto-updated on install — the goal is
that `npm install && npm run dev` always works on day one.

Recommended workflow when starting a new project from this scaffold:

1. `npm install` in both `app/` and `firebase/functions/` and confirm
   `npm run dev` boots cleanly.
2. Commit the scaffold as your baseline (`git commit -m "initial scaffold"`).
3. Run `npm outdated` in each folder to see drift, and `npm audit` for
   security issues.
4. Upgrade deliberately — one major version at a time, testing between each.
   Watch especially for breaking changes in Vite, Capacitor, Tailwind,
   Firebase Functions, and zod (these have all shipped breaking majors in
   the past).
5. After upgrading, re-run `npm run dev`, click through the hero transition
   and the /about health check before committing.

Avoid running `npm update` blindly — it will pull breaking majors without
warning and you'll lose the "clean baseline" property.

## Project docs

- `PLAN.md` — the development plan (phases, domain model, screens)
- `docs/specs/house-rules.md` — authoritative Canastón scoring rules
- `docs/architecture.md`, `docs/animations.md`, `docs/i18n.md`
- `docs/design.md` — visual design system (target audience, palette, typography, tokens)
