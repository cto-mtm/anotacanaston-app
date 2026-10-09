# Plan — Club conversion (benefits, banners, upsell moments)

Goal: make Club (cloud sync, Stripe product "Canastón Premium") understandable
and reachable for every user, without nagging a 40+ card-night audience. See
`docs/business-model.md` for tiers and the original conversion-hook ideas.

## Honest value proposition

Free users already keep their full history (sessions, partners, scores) **on
their device**. Club is not "keep your history" — it is:

1. **Backup** — sessions survive a lost phone, a reinstall, or cleared browser data.
2. **Every device** — the same sessions on phone, tablet and computer.
3. **Stats & player profiles** *(coming soon — Phase 4)* — lifetime wins, head-to-head, streaks.
4. **Game nights** *(coming soon — Phase 5)* — plan a night, invite via WhatsApp, guests don't pay.

The benefits UI must label 3–4 as "Próximamente" until they ship.

## Current flow (before this plan)

Welcome (offline vs Google sign-in) → offline users never see Club again →
signed-in non-payers see one gold banner on Home with a **wrong hardcoded
price ($3.99; Stripe is 2.99)** → Stripe Checkout → return → sync starts.
Native apps can't buy (store rules) and only see "managed on the web".

## Phases

### Phase 1 — Price + benefits modal + status banner *(done — needs a functions + hosting deploy)*

- **Live price.** `GET /billing/price` (public) returns the Club product's
  default price `{ amount, currency, interval }` from Stripe (same cached
  lookup checkout uses). The client formats it with vue-i18n `n()`; while it
  loads or if it fails, the price line is simply hidden — never a stale literal.
- **`ClubBenefitsModal`** — one global modal (mounted in `App.vue`, opened via
  `useClubModal()`): 4 swipeable benefit cards (CSS scroll-snap, dots), price,
  and a state-aware CTA:
  - not signed in → "Iniciar sesión y suscribirme" (Google sign-in, then checkout)
  - signed in, not paying → "Suscribirme" (checkout)
  - native app → benefits + "La suscripción se gestiona desde la web" (no CTA)
- **`AccountBanner` for every user** on Home:
  - offline, ≥1 session → "N partidas guardadas solo en este teléfono" · "Ver Club"
  - signed in, not paying → "Tus partidas no tienen respaldo" · "Ver Club"
  - paying → "Todo guardado en la nube" (unchanged, not dismissible)
  - "Ahora no" snoozes: 7 days, then 30 days; after the 3rd dismissal the
    banner stops showing (Club stays reachable from Settings and Welcome).
- **Entry points:** Home banner, Welcome page ("Ver beneficios"), Settings ("Anota Canaston Club").

### Phase 1b — Hardening *(done)*

- Stripe Customer Portal (`POST /billing/portal`) → "Gestionar suscripción" in Settings.
  **Requires enabling the Customer Portal in the Stripe dashboard.**
- Checkout refuses accounts that already have Club (409) and reuses the saved Stripe customer.
- Per-account ownership of synced sessions: a different account signing in on the same
  device never receives the previous account's games.
- Live sync: Firestore listener applies other devices' edits; house rules sync too.
- Account deletion (`POST /account/delete`): cancels Club, deletes cloud data + login.
- Draft privacy page (`/privacy`) — needs legal review and a contact address.
- Native apps: sign-in hidden with a "coming soon" note until a native auth plugin lands.

### Phase 1c — Brand redesign + player dashboard *(dashboard done; redesign after `membership-and-storage.md`)*

> The sync engine and paywall state from Phases 1–1b are being replaced — see
> `docs/plans/membership-and-storage.md`.

- Playful, Duolingo-grade UX in the brand's own look (from the logo): bolder color,
  chunky buttons, celebratory feedback, page transitions via the View Transitions wrapper.
- Dashboard: group leaderboard, totals, streaks, best partnerships, records, recent sessions —
  computed by `domain/stats.ts`.

### Phase 2 — Upsell moments

- Session summary → "¿Guardar esta partida para siempre?" card (non-paying only).
- After the 3rd saved session → one-time modal open.
- Empty Home for a returning signed-in non-payer → "¿Tenías partidas? Con Club no se pierden."
- All respect the same snooze state as the banner.

### Phase 3 — Native purchase path

- RevenueCat (or store billing) for iOS/Android so the modal CTA works in-app.

### Phase 4 — Stats & player profiles (the main paid draw)

- Player directory (stable ids across sessions, name autocomplete).
- Lifetime stats: win rate, head-to-head, streaks, records — pure functions in `domain/`.
- Split: free shows recent stats on-device; Club keeps the full history synced.

### Phase 5 — Game nights → Tournaments

- Game night: date, place, invite link/QR for WhatsApp, RSVP; guests free.
- Reuses invite/RSVP pieces for the Tournament service (`business-model.md`, $4.99/event).

## Open questions

- [ ] Game nights: Club perk (current assumption) or a separate purchase?
- [ ] Yearly plan (business-model.md lists $34.99/yr) — add a second Stripe price?
- [ ] Free-tier stats teaser: last 5 sessions?
