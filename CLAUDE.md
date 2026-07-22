# Anota Canaston

## Project Structure

- `app/` — Vue 3 + Vite web app, wrapped by Capacitor for iOS/Android
- `firebase/` — Firebase Hosting config + Cloud Functions API + emulator scripts
- `docs/` — Internal documentation (read `docs/animations.md` before touching any animation, `docs/i18n.md` before touching any user-facing string)
- `PLAN.md` — the development plan this app was built from (phases, domain rules, screens)
- `docs/specs/house-rules.md` — authoritative Canastón scoring rules
- `rules.txt` — standard Canastone rules, background only (house-rules.md wins on conflicts)

## Development

- **Do not** run `vite build`, `npm run build`, `cap sync`, or any build commands unless explicitly asked.
- **Do not** prompt the user asking if they would like to run a build.
- The dev server (`npm run dev`) and the Firebase emulators (`npm run emulators` in `firebase/`) are managed by the user separately.
- Local dev never needs a real Firebase project — the emulators run offline under the `demo-app` project id.
- Use `npm` as the package manager (not yarn or pnpm).

## Domain rules

- All score math lives in `app/src/domain/` (pure TS, zero Vue imports). Components and stores must never re-implement a formula — they call the engine.
- `docs/specs/house-rules.md` is authoritative; where it's ambiguous, PLAN.md's "Rule interpretations" section is the resolved decision.

## i18n rules (non-negotiable)

- No hardcoded user-facing strings in templates or stores — every string is a key in a per-feature module under `src/i18n/locales/`, resolved with `useI18n()`'s `t()`.
- Adding a string means adding the key to **all** locales (es + en) in the same change — `en` is typed `typeof es`, so a missing key is a compile error.

## Animation rules (non-negotiable)

- Page-to-page animation goes through the View Transitions wrapper in `src/router/index.ts` — never call `document.startViewTransition` anywhere else.
- Hero transitions = matching `view-transition-name` on source and target, derived from the item id. Names must be unique per page.
- Animate only `transform` and `opacity`. Durations 200–350ms.
- All transition CSS lives in `src/assets/css/transitions.css`, organized as numbered recipes.
- Every animation must degrade gracefully: reduced-motion and unsupported browsers get instant navigation.
