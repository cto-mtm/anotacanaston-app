# Boilerplate Scaffolding Prompt — Vue 3 + Vite + Capacitor + GCP (Firebase Hosting + Cloud Functions)

> Paste this entire document into a fresh Claude session (Cowork mode or Claude Code) to scaffold a generic, business-agnostic **web app** boilerplate that runs in the browser today and can ship as an iOS/Android app via Capacitor with zero restructuring. It includes a first-class, LLM-friendly **animation system** (hero / shared-element transitions à la Flutter, page transitions, list animations) built on the native View Transitions API — no animation library. It is **local-first**: the entire stack (app + API) must run on a fresh machine with the Firebase Emulator Suite, no Firebase project, no credentials, no internet beyond `npm install`. It ships with **vue-i18n** wired in from day one.

---

## Your Task

Create a runnable boilerplate repo in a brand-new folder called **`app-boilerplate/`** (or whatever name I provide after pasting this). The boilerplate must be a faithful, business-agnostic copy of the architecture described below. When you're done, I should be able to:

```bash
cd app-boilerplate
cd firebase/functions && npm install && npm run build   # compile functions
cd .. && npm run emulators                              # full local backend on :5001 (NO Firebase project needed)
# in a second terminal:
cd app && npm install && npm run dev                    # web app on :5173, already pointed at the emulator
```

**This must work on a machine with no Firebase project and no login** — the emulator scripts use a `demo-app` project id (the `demo-` prefix tells the Emulator Suite to run fully offline and never touch production resources). Visiting `http://localhost:5173/about` on a fresh clone must show a successful `/health` response from the emulated function.

And later, without changing app code:

```bash
cd app && npm run build
npx cap add ios && npx cap add android         # one-time
npx cap sync && npx cap open ios               # native shells
```

Don't run `npm install`, `vite build`, `cap sync`, or any build commands yourself — just produce the files. Don't ask me whether to run a build.

---

## Top-Level Layout

```
app-boilerplate/
├── CLAUDE.md
├── README.md
├── .gitignore
├── .firebaserc                  (template with REPLACE_ME project id)
├── scripts/
│   └── deploy.mjs               (build app → copy dist → firebase deploy; `npm run deploy`)
├── docs/
│   ├── architecture.md
│   ├── animations.md            (the animation cookbook — see below)
│   └── i18n.md                  (the translations cookbook — see below)
├── app/                         (Vue 3 + Vite + Capacitor app)
│   └── assets/                  (icon.png / splash.png sources for @capacitor/assets)
└── firebase/                    (Hosting config + Cloud Functions + emulator setup)
    ├── firebase.json
    ├── package.json             (emulator convenience scripts — see below)
    └── functions/
```

---

## `app/` — Vue 3 + Vite + Capacitor

### `app/package.json`

```json
{
  "name": "boilerplate-app",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 5173",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "cap:sync": "npm run build && cap sync",
    "cap:ios": "npm run build && cap sync ios && cap open ios",
    "cap:android": "npm run build && cap sync android && cap open android",
    "cap:assets": "capacitor-assets generate"
  },
  "dependencies": {
    "@capacitor/android": "^7.4.0",
    "@capacitor/app": "^7.0.0",
    "@capacitor/core": "^7.4.0",
    "@capacitor/ios": "^7.4.0",
    "@capacitor/keyboard": "^7.0.0",
    "@capacitor/status-bar": "^7.0.0",
    "pinia": "^3.0.3",
    "vue": "^3.5.24",
    "vue-i18n": "^11.1.0",
    "vue-router": "^4.6.3",
    "zod": "^4.1.13"
  },
  "devDependencies": {
    "@capacitor/assets": "^3.0.5",
    "@capacitor/cli": "^7.4.0",
    "@tailwindcss/vite": "^4.1.0",
    "@vitejs/plugin-vue": "^6.0.0",
    "@vue/eslint-config-typescript": "^14.0.0",
    "eslint": "^9.39.1",
    "eslint-plugin-vue": "^10.0.0",
    "tailwindcss": "^4.1.0",
    "typescript": "^5.9.3",
    "vite": "^7.1.0",
    "vue-tsc": "^3.0.0"
  }
}
```

### `app/vite.config.ts`

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  // Capacitor loads the app from capacitor://localhost — relative asset
  // paths are required or the native build 404s on every chunk.
  base: './',
  build: { outDir: 'dist' },
})
```

### `app/capacitor.config.ts`

```ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.replaceme.app',        // REPLACE_ME — reverse-DNS bundle id
  appName: 'REPLACE_ME',
  webDir: 'dist',
  // Uncomment during development to live-reload inside the native shell:
  // server: { url: 'http://192.168.1.XX:5173', cleartext: true },
}

export default config
```

### `app/.env` handling

- Create `app/.env.example` with `VITE_API_URL=http://127.0.0.1:5001/demo-app/us-central1/api` — note this points at the **emulator** with the offline `demo-app` project id, so local dev works before any Firebase project exists.
- `.env` itself is gitignored; the README quick start's first app step is `cp .env.example .env`.
- In `src/lib/api.ts`, when `import.meta.env.VITE_API_URL` is missing, fall back to the same emulator URL in dev (`import.meta.env.DEV`) and to `https://us-central1-REPLACE_ME.cloudfunctions.net/api` in prod builds — so `npm run dev` works even if I forget the copy step.
- Read the value only via `src/lib/api.ts` — nowhere else.

### `app/src/` Structure

```
app/src/
├── main.ts                  (createApp + pinia + router + i18n + main.css + registerNative())
├── App.vue                  (RouterView wrapped in AppShell layout)
├── router/
│   └── index.ts             (routes + View Transition integration — see below)
├── i18n/
│   ├── index.ts             (createI18n, legacy: false — see i18n section)
│   └── locales/
│       ├── en.json
│       └── es.json
├── stores/
│   └── items.ts             (Pinia store seeded with 6 placeholder items)
├── lib/
│   ├── api.ts               (typed fetch wrapper for the Cloud Function)
│   └── native.ts            (registerNative(): Android back button — see below)
├── composables/
│   ├── useApi.ts            (loading/error/data wrapper around lib/api)
│   └── useReducedMotion.ts  (reactive prefers-reduced-motion media query)
├── components/
│   ├── AppShell.vue         (safe-area-aware header + <main> + bottom nav)
│   ├── ItemCard.vue         (card with the hero source image — see below)
│   ├── LocaleSwitcher.vue   (tiny en/es toggle in the AppShell header)
│   └── BaseButton.vue       (one styled button, neutral colors)
├── pages/
│   ├── HomePage.vue         (grid of ItemCards — hero transition source)
│   ├── ItemDetailPage.vue   (/items/:id — hero transition target)
│   ├── AboutPage.vue        (static page; calls GET /health to prove the emulator wiring)
│   └── NotFoundPage.vue     (catch-all 404 — minimal, links home)
└── assets/
    └── css/
        ├── main.css         (Tailwind import + safe-area utilities)
        └── transitions.css  (ALL view-transition CSS lives here — see below)
```

The Pinia store seeds 6 items shaped like `{ id, titleKey, blurbKey, color }` where `color` is a Tailwind-ish hex and the `*Key` fields are i18n message keys (see i18n section). `ItemCard.vue` renders a colored `<div>` block instead of a real image (no binary assets in the scaffold) — the hero transition works identically on it.

### `lib/native.ts` — Android back button (required)

Export `registerNative(router: Router)` called once from `main.ts`. It must:

- Listen to `App.addListener('backButton', ...)` from `@capacitor/app`.
- If `window.history.state?.back` exists (vue-router has somewhere to go), call `router.back()`; otherwise call `App.exitApp()`.
- Guard the whole registration with `Capacitor.isNativePlatform()` so it's a no-op in the browser.
- Comment why this exists: without it, the Android hardware/gesture back button closes the app from any page.

`AppShell.vue` must use `env(safe-area-inset-*)` padding on header and bottom nav so the same markup is correct in the browser and inside the iOS/Android shells. Add `viewport-fit=cover` to the viewport meta in `index.html`.

---

## The Animation System — Required, Read Carefully

This is the heart of the boilerplate. The goal: **clean, native-feeling animations that an LLM can add or modify by following a mechanical recipe** — no timeline math, no animation library, no JS-driven tweening. Two primitives only:

1. **View Transitions API** (`document.startViewTransition`) for *between-page* animations, including Flutter-style hero/shared-element transitions.
2. **Vue's built-in `<Transition>` / `<TransitionGroup>`** for *within-page* enter/leave (modals, list items, toasts).

Nothing else. Don't add motion libraries, GSAP, or scroll-jacking.

### Router integration (`app/src/router/index.ts`)

Implement exactly this pattern: wrap route changes in `startViewTransition` when available, fall back to instant navigation when not (or when reduced motion is on).

```ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('../pages/HomePage.vue') },
    { path: '/items/:id', name: 'item-detail', component: () => import('../pages/ItemDetailPage.vue') },
    { path: '/about', name: 'about', component: () => import('../pages/AboutPage.vue') },
    // Catch-all 404. Required because Firebase Hosting rewrites every URL
    // to index.html — without this, typos render an empty RouterView.
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../pages/NotFoundPage.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

// ── VIEW TRANSITION WRAPPER ─────────────────────────────────────
// Every navigation becomes a view transition when the browser
// supports it. Pages opt into specific effects purely via CSS in
// assets/css/transitions.css — this file never changes per-page.
router.beforeResolve(async (to, from) => {
  if (from === START_LOCATION) return            // initial load: no transition
  if (!document.startViewTransition) return      // unsupported: navigate plainly
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

  return new Promise<void>((resolve) => {
    document.startViewTransition(() => {
      resolve()
      return router.isReady()                    // let Vue swap the page inside the snapshot
    })
  })
})
```

(Import `START_LOCATION` from `vue-router`. If this exact promise dance needs adjusting to make the DOM swap happen *inside* the transition callback, adjust it — the contract is: old page snapshotted, route swap, new page snapshotted, browser cross-fades.)

### Hero / shared-element recipe

This is the Flutter-`Hero`-equivalent and it must work in the scaffold out of the box, demonstrated by `ItemCard.vue` → `ItemDetailPage.vue`:

- In `ItemCard.vue`, the colored block gets an **inline dynamic style**: `:style="{ viewTransitionName: 'item-' + item.id }"`.
- In `ItemDetailPage.vue`, the large header block for the same item gets the **same name**: `:style="{ viewTransitionName: 'item-' + item.id }"`.
- That's the entire mechanism. The browser matches the two names across the navigation and morphs position/size automatically.
- **Critical rule (comment it in both files):** a `view-transition-name` must be unique per page at any moment. Never put a static name in a `v-for` — always derive it from the item id.

Title text on card and detail page should likewise share `'item-title-' + item.id` so the text morphs too — this shows the recipe generalizes beyond images.

### `assets/css/transitions.css`

All transition tuning lives in one file, heavily commented, structured as named recipes an LLM can copy:

```css
/* ════════════════════════════════════════════════════════════
   VIEW TRANSITION RECIPES
   Rules of the house:
   - Animate ONLY transform and opacity (compositor-friendly).
   - Durations 200–350ms. Easing: cubic-bezier(0.4, 0, 0.2, 1).
   - Every recipe must look acceptable if it simply cross-fades
     (that's the automatic fallback).
   ════════════════════════════════════════════════════════════ */

/* Recipe 1 — default page cross-fade (applies to everything) */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 220ms;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Recipe 2 — hero elements: the morph is automatic; we only tune timing.
   Matches any element carrying a view-transition-name of item-* via the
   universal group selector. */
::view-transition-group(*) {
  animation-duration: 300ms;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Recipe 3 — reduced motion: kill everything. */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

(Adjust selectors if needed so the scaffold actually works — but keep the three-recipe structure and the comments.)

### Within-page recipe (Vue `<Transition>`)

`HomePage.vue` includes one `<TransitionGroup name="list">` demo: a "shuffle" button reorders the item grid with a FLIP move animation (`.list-move { transition: transform 250ms }`). Define `.list-enter-*`, `.list-leave-*`, `.list-move` classes in `transitions.css` under a "Recipe 4" header.

### `docs/animations.md` — the cookbook

Write a one-page doc with these sections, each a copy-pasteable recipe with the exact steps:

1. **Add a hero transition between two pages** (the 3-step name-matching recipe above).
2. **Add a custom per-page transition** (give one worked example: slide-in for `/about` by assigning `view-transition-name: about-page` to its root and one `@keyframes`).
3. **Animate a list reorder/insert/remove** (`<TransitionGroup>` + Recipe 4 classes).
4. **The rules** — transform/opacity only, 200–350ms, unique names per page, always test with reduced motion, never nest `startViewTransition` calls.
5. **Platform support note** — Chromium (incl. Android WebView) since 111, iOS WKWebView since iOS 18; on anything older the wrapper silently degrades to instant navigation, which is the designed fallback, not a bug.

---

## i18n Cookbook - Ask if needed

vue-i18n in Composition API mode (`legacy: false`). Spanish (`es`) is the primary authored locale ; English (`en`) is the fallback. Setup lives in `src/i18n/index.ts`.

Strings live in **per-feature TypeScript modules**, not in monolithic JSON. Each module co-locates both locales and types `en` against `es`, so a missing or extra key in either language is a **compile-time error** — not a runtime warning.

### Structure

```
src/i18n/
├── index.ts                 # assembles modules, builds messages, type augmentation
└── locales/
    ├── configs/             # cross-cutting vocab (common)
    ├── components/          # component-scoped strings (shell, tour, staff, billing, …)
    └── pages/               # page/route-scoped strings (patients, consultation, login, …)
```

The folder is organizational only. Each module registers under its **namespace key** (the file name), so keys stay `t('patients.title')` regardless of folder.

### Module format

```ts
const es = {
  title: 'Pacientes',
  empty: 'Sin pacientes',
}

// Typed against es: a missing or extra key here is a compile error.
const en: typeof es = {
  title: 'Patients',
  empty: 'No patients',
}

export default { es, en }
```

`es` is the source of truth. Because `en` is typed `typeof es`, you literally cannot ship a namespace where the two locales diverge — TypeScript rejects it.

### 1. Add a translated string

1. Open the module for that feature (e.g. `locales/pages/patients.ts`).
2. Add the key to **both** `es` and `en` in the same edit. If you forget one, `tsc` fails on `en: typeof es`.
3. In the component: `const { t } = useI18n()` then `t('patients.key')`. Keys autocomplete from the schema.

Never options-API `$t`, never a hardcoded user-facing string in a template or store.

> Type-safety note: `en`↔`es` key parity is enforced at compile time. Key **autocompletion** also works (via the `DefineLocaleMessage` augmentation in `index.ts`). However, vue-i18n keeps a permissive `t(key: string)` overload, so an outright typo in a `t()` call is *not* a `tsc` error — vue-i18n's missing-key console warning remains the dev-time backstop for that case.

### 2. Add a new namespace

1. Create `locales/<folder>/<name>.ts` exporting `{ es, en }` in the format above.
2. In `index.ts`, import it and add one line to each of the `es` and `en` blocks of `messages`. (If the namespace collides with a JS reserved word like `import`, alias the binding — e.g. `import importMessages from './locales/pages/import'` — but keep the registered key unchanged.)

### 3. Add a new locale

1. For every module, add the new locale alongside `es`/`en`, or restructure `{ es, en }` exports to include it. Diff against `es` to translate everything.
2. Add the code to `SUPPORTED_LOCALES` and the `messages` blocks in `index.ts`, and to `datetimeFormats`.
3. If the locale belongs to a new country, also add the country config doc (see `docs/architecture.md` — country layer).

### 4. Translate data (not just UI chrome)

Stores and seed data hold message **keys** where content is app-owned (e.g. enum display names: `t('settings.role.' + role)`, statuses, field-type labels). Clinical content typed by doctors is user data — it is NOT translated.

### 5. Dates, numbers, currency

Use `d(date, 'short')` / `n(value, ...)` from `useI18n()` — never hand-format. Times are stored UTC and rendered in the clinic's timezone (country config supplies the default). Careful using '@' they need to be scaped.

### The rules

Every user-facing string is a key in a per-feature module, present in both `es` and `en`. Adding a string = both locales, same commit, enforced by the type system. Data stays translatable via keys. `LocaleSwitcher.vue` flips the global locale.

## `firebase/` — Hosting + Cloud Functions + Emulator Suite

### `firebase/firebase.json`

```json
{
  "hosting": {
    "public": "app",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }],
    "headers": [
      { "source": "assets/**", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
      { "source": "images/**", "headers": [{ "key": "Cache-Control", "value": "public, max-age=86400" }] }
    ]
  },
  "functions": [
    { "source": "functions", "codebase": "default" }
  ],
  "emulators": {
    "functions": { "port": 5001 },
    "hosting": { "port": 5000 },
    "ui": { "enabled": true, "port": 4000 },
    "singleProjectMode": true
  }
}
```

### `firebase/package.json` — Emulator Convenience Scripts

A tiny package.json whose only job is making local dev one command (no dependencies — `firebase-tools` is assumed globally installed; say so in the README with the install one-liner `npm i -g firebase-tools`):

```json
{
  "name": "boilerplate-firebase",
  "private": true,
  "scripts": {
    "emulators": "npm --prefix functions run build && firebase emulators:start --only functions --project demo-app",
    "emulators:all": "npm --prefix functions run build && firebase emulators:start --project demo-app",
    "emulators:watch": "firebase emulators:start --only functions --project demo-app"
  }
}
```

Document in the README why `--project demo-app`: any project id prefixed `demo-` makes the Emulator Suite run **fully offline** — it never attempts to reach real Firebase resources and needs no `firebase login`. This is what makes the scaffold runnable on day one with the `REPLACE_ME` `.firebaserc` untouched. (`emulators:all` additionally serves the built app from `firebase/app/` on :5000 — useful for a production-like smoke test; day-to-day dev uses Vite on :5173.) For the tightest loop, the README's "daily workflow" section should suggest `npm run build:watch` in `firebase/functions/` alongside `emulators:watch` — the emulator hot-reloads functions when `lib/` changes.

Notes to document in `docs/architecture.md`:
- Hosting `public` is `"app"` because the deploy flow copies `app/dist/` into `firebase/app/`.
- The SPA rewrite (`** → /index.html`) is required because the app uses `createWebHistory` (real URLs, no hash).

### `.firebaserc` (at repo root)

```json
{
  "projects": { "default": "REPLACE_ME_FIREBASE_PROJECT_ID" }
}
```

### `firebase/functions/package.json`

```json
{
  "name": "boilerplate-functions",
  "description": "Cloud Functions API for the boilerplate app",
  "engines": { "node": "20" },
  "main": "lib/index.js",
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "serve": "npm run build && firebase emulators:start --only functions",
    "deploy": "npm run build && firebase deploy --only functions"
  },
  "dependencies": {
    "firebase-admin": "^13.0.0",
    "firebase-functions": "^6.3.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

### `firebase/functions/tsconfig.json`

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "outDir": "./lib",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "lib"]
}
```

### `firebase/functions/src/` Structure

```
src/
├── index.ts                 (re-exports api)
├── api.ts                   (single onRequest router — see behavior below)
├── models.ts                (zod schemas per endpoint, one seeded example)
└── helpers/
    └── cors.ts              (allow-list check + preflight handling)
```

### `api.ts` Behavior — Required

Implement `api` as a single `onRequest` v2 function with hand-rolled routing (no Express — keep the dependency surface minimal):

- Region `us-central1`, `maxInstances: 10`
- CORS allow-list: `["https://example.com", "https://www.example.com", "http://localhost:5173", "capacitor://localhost", "http://localhost"]` — with a `REPLACE_ME` comment above the array. **The last two entries are what the iOS/Android shells send as Origin; comment this so nobody deletes them.**
- Routes:
  - `GET /health` → `{ ok: true, ts: <iso string> }`
  - `POST /echo` → validate body against `models.echoSchema` (`{ message: string (min 1), name?: string }`); 400 with `error.flatten()` on `ZodError`; otherwise return `{ success: true, echoed: <parsed body> }`
- 404 JSON for unknown routes (list valid routes in the error)
- Log via `firebase-functions/v2` logger
- Include a commented-out `defineSecret` example showing how to add a secret later (don't define real ones)

---

## `app/src/lib/api.ts` + `composables/useApi.ts`

`lib/api.ts`:
- Exports `apiFetch<T>(path: string, init?: RequestInit): Promise<{ ok: true, data: T } | { ok: false, error: string }>`
- Base URL from `import.meta.env.VITE_API_URL`, falling back to `https://us-central1-REPLACE_ME.cloudfunctions.net/api`
- JSON in/out, throws nothing — all failures surface in the return value

`composables/useApi.ts`:
- Wraps `apiFetch` with `ref`s: `{ data, error, loading, execute }`
- `AboutPage.vue` uses it to call `GET /health` and render the result, so the full app→function path is demonstrated end to end

---

## `scripts/deploy.mjs`

A short, commented Node script (cross-platform — no bash or shell builtins, so it runs on Windows too) that makes the deploy story real instead of folklore. Wire it up as `"deploy": "node scripts/deploy.mjs"` in the root `package.json`:

1. Fail fast with a clear message if `.firebaserc` still says `REPLACE_ME`
2. `npm run build` in `app/`
3. Replace `firebase/app` with a copy of `app/dist`
4. `firebase deploy` in `firebase/` (uses the real project from `.firebaserc`)

Abort on the first failing step. Reference `npm run deploy` from the README deploy section as the one true deploy path.

---

## `app/assets/` — Icons & Splash Screens

Create `app/assets/` containing only a `README.md` explaining the convention (no binary files in the scaffold):

- Drop a 1024×1024 `icon.png` and a 2732×2732 `splash.png` (+ optional `icon-foreground.png` / `icon-background.png` for Android adaptive icons) into this folder.
- Run `npm run cap:assets` — `@capacitor/assets` generates every required size for iOS and Android directly into the native projects.
- Re-run after every `npx cap add <platform>`.

---

## `.gitignore` (repo root)

Logs, `firebase-debug*.log*`, `.firebase/`, `firebase/.firebase/`, `firebase/app/`, `node_modules/`, `.env`, `.env.*` (but **not** `.env.example`), `.DS_Store`, `.claude/`, `dist/`, `app/ios/`, `app/android/` — with a comment explaining the native folders are generated by `cap add` and excluded by default; remove those two lines once you start customizing native code and want them in git.

---

## `CLAUDE.md` (repo root)

```markdown
# {{PROJECT_NAME}}

## Project Structure

- `app/` — Vue 3 + Vite web app, wrapped by Capacitor for iOS/Android
- `firebase/` — Firebase Hosting config + Cloud Functions API + emulator scripts
- `docs/` — Internal documentation (read `docs/animations.md` before touching any animation, `docs/i18n.md` before touching any user-facing string)

## Development

- **Do not** run `vite build`, `npm run build`, `cap sync`, or any build commands unless explicitly asked.
- **Do not** prompt the user asking if they would like to run a build.
- The dev server (`npm run dev`) and the Firebase emulators (`npm run emulators` in `firebase/`) are managed by the user separately.
- Local dev never needs a real Firebase project — the emulators run offline under the `demo-app` project id.
- Use `npm` as the package manager (not yarn or pnpm).

## i18n rules (non-negotiable)

- No hardcoded user-facing strings in templates or stores — every string is a key in `src/i18n/locales/*.json`, resolved with `useI18n()`'s `t()`.
- Adding a string means adding the key to **all** locale files in the same change.

## Animation rules (non-negotiable)

- Page-to-page animation goes through the View Transitions wrapper in `src/router/index.ts` — never call `document.startViewTransition` anywhere else.
- Hero transitions = matching `view-transition-name` on source and target, derived from the item id. Names must be unique per page.
- Animate only `transform` and `opacity`. Durations 200–350ms.
- All transition CSS lives in `src/assets/css/transitions.css`, organized as numbered recipes.
- Every animation must degrade gracefully: reduced-motion and unsupported browsers get instant navigation.
```

---

## `README.md` (repo root)

Short and practical. Cover:

1. What's in the box (Vue 3 + Vite + Capacitor app, Firebase Hosting + a Cloud Functions API, full local dev via the Emulator Suite, View-Transitions animation system, vue-i18n).
2. **Quick start — fully local, no Firebase account** (the exact 4-step flow from "Your Task": global `firebase-tools` install, install+build functions, `npm run emulators`, then `cp .env.example .env && npm run dev` in `app/`). Include the "daily workflow" two-terminal setup.
3. **How to add a hero transition** (point to `docs/animations.md`, summarize the 3-step recipe inline).
4. **How to add a translated string / a new locale** (point to `docs/i18n.md`).
5. How to add an API endpoint (add schema to `models.ts`, add route branch in `api.ts`, call via `apiFetch`) — and note it's testable immediately against the emulator.
6. Going native: `npm run build`, `npx cap add ios|android`, `npm run cap:assets` (after dropping icon/splash sources into `app/assets/`), `npx cap sync`, open in Xcode/Android Studio; reminders that the API CORS allow-list already includes the Capacitor origins and that the Android back button is already handled in `lib/native.ts`.
7. Deploy: set the real project id in `.firebaserc`, set `VITE_API_URL` for prod, then `npm run deploy`.
8. **Keeping dependencies fresh** — include this section verbatim:

   ```markdown
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
   ```

---

## `docs/architecture.md`

A one-page brief explaining how the pieces fit together: Vite builds the SPA into `app/dist/`; `scripts/deploy.mjs` (`npm run deploy`) copies it to `firebase/app/` where Firebase Hosting serves it with an SPA rewrite; the same `dist/` is what Capacitor packages into the iOS/Android shells (`webDir: 'dist'`); the app talks to one Cloud Function (`api`) over JSON with a CORS allow-list that includes both web and Capacitor origins; in local dev the function runs in the Firebase Emulator Suite under the offline `demo-app` project id and the app targets it via `VITE_API_URL`; navigation animations run through the View Transitions wrapper in the router with automatic degradation; all user-facing strings flow through vue-i18n.

End with a short **"When you need deep links"** note: opening `https://yourdomain/items/3` directly into the native app requires Universal Links (iOS: `apple-app-site-association` file + Associated Domains entitlement) and App Links (Android: `assetlinks.json` + intent filters). It's deliberately not scaffolded — link the official Capacitor deep-links guide and note the SPA routes are already shaped to support it.

---

## Style / Quality Bar

- TypeScript everywhere; strict mode on in both `app/` and `functions/`.
- **Local-first is a hard requirement**: the quick-start flow must work on a fresh machine with no Firebase project, no `firebase login`, and no edits to `.firebaserc`. If anything you scaffold would break that, fix the scaffold, not the requirement.
- No business-specific copy anywhere. Everything user-facing is a generic placeholder ("Item One", lorem blurbs) living in the i18n locale files, or a `REPLACE_ME` token. I'll do find-and-replace once I know what I'm building.
- Don't invent third-party services or features beyond what's listed here. Don't add auth, Firestore, push notifications, payments, animation libraries, or i18n routing plugins.
- Don't run installs or builds. Just produce files.
- The hero transition demo (HomePage card → ItemDetailPage header) must be complete and correct in the scaffold — it is the reference implementation every future animation copies.
- When you're done, list every file you created (relative paths) so I can spot-check.

---

## Clarifying Questions to Ask Me Before Starting

Before scaffolding, ask me:

1. What should the **repo folder name** be? (default: `app-boilerplate`)
2. What **placeholder app name and bundle id** should I use in `capacitor.config.ts` / CLAUDE.md / README? (defaults: `Boilerplate App`, `com.boilerplate.app`)
3. Which **locales** should I seed? (default: `en` + `es`, with `en` as fallback)
4. Should I commit the generated files as an **initial git commit**, or leave the working tree dirty?

Then proceed.
