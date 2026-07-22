# Architecture

Vite builds the SPA into `app/dist/`. `scripts/deploy.sh` copies that build into
`firebase/app/`, where Firebase Hosting serves it with an SPA rewrite
(`** → /index.html`) — required because the app uses `createWebHistory` (real
URLs, no hash). The same `dist/` is what Capacitor packages into the iOS/Android
shells (`webDir: 'dist'` in `capacitor.config.ts`).

The app talks to one Cloud Function (`api`) over JSON, with a CORS allow-list
that includes both web origins and the Capacitor origins
(`capacitor://localhost`, `http://localhost`) — native shells send these as
their `Origin` header.

In local dev the function runs in the Firebase Emulator Suite under the
offline `demo-app` project id (any project id prefixed `demo-` makes the
Emulator Suite run fully offline, no `firebase login` needed) — the app
targets it via `VITE_API_URL` (see `app/.env.example`).

Navigation animations run through the View Transitions wrapper in the router
(`app/src/router/index.ts`) with automatic degradation to instant navigation
on unsupported browsers or reduced-motion. All user-facing strings flow
through vue-i18n (`app/src/i18n/`).

Hosting `public` is `"app"` (see `firebase/firebase.json`) because the deploy
flow copies `app/dist/` into `firebase/app/`.

## Domain layer

Score math for Canastón lives entirely in `app/src/domain/` — pure TypeScript,
zero Vue imports. Stores (`app/src/stores/`) hold only raw round entries;
totals, thresholds, and winners are recomputed on every read by calling into
the domain engine, never re-implemented at the component or store level. See
`PLAN.md` at the repo root for the full domain model and rule interpretations.

## When you need deep links

Opening `https://yourdomain/sessions/3` directly into the native app requires
Universal Links (iOS: `apple-app-site-association` file + Associated Domains
entitlement) and App Links (Android: `assetlinks.json` + intent filters). This
is deliberately not scaffolded — see the
[Capacitor deep links guide](https://capacitorjs.com/docs/guides/deep-links).
The SPA routes are already shaped to support it.
