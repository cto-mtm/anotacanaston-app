# Plan — Membership state + storage re-architecture

Replaces the hand-rolled sync engine and the scattered paywall state with two
clean pieces: a **membership store** (server-authoritative, live) and a
**storage layer** that picks where games live by membership. Pre-launch, so no
data migration or backward compatibility is needed.

Related: `docs/plans/club-conversion.md` (benefits, banners, upsell),
`docs/business-model.md` (tiers).

---

## Why

| Today | Problem |
|---|---|
| `account.entitled` persisted + re-checked only at sign-in / checkout return | Stale: a lapse or cancellation mid-session isn't noticed; UI says "synced" while Firestore rejects writes |
| Checkout return polls the entitlement 5× | Fragile timing; exists only because entitlement isn't live |
| Sync state in module variables in `lib/auth.ts` | Invisible to the UI — no "syncing / failed / offline" status |
| Custom LWW merge: stamps, tombstones, ownership map, retry loop (~300 lines) | Two reviews found 6 bugs; relies on device clocks; sync metadata pollutes the sessions store |

## Target architecture

```
        Firebase Auth ──► account store (identity: mode, user)
                                │
 users/{uid} (live listener) ──► membership store (status + capabilities)
                                │
                                ▼
            storage layer: picks the backend by capabilities.canSync
             ├─ LocalBackend  → Pinia + localStorage   (free / offline / lapsed)
             └─ CloudBackend  → Firestore + offline cache (members)
                                │
                                ▼
          sessions store (games only)  ──►  domain/ (unchanged, pure)
```

Components keep calling the same store actions; they never know which backend
is active. `domain/` doesn't change at all.

---

## 1. Membership store (`stores/membership.ts`)

### State machine

| Status | Meaning | `canSync` |
|---|---|---|
| `anonymous` | not signed in (offline mode or welcome) | no |
| `checking` | signed in, first `users/{uid}` snapshot not received yet | no (UI shows a neutral state, never "not backed up") |
| `free` | signed in, never subscribed | no |
| `member` | subscription `active` / `trialing` | yes |
| `graceful` | subscription `past_due` — Stripe is retrying the card | yes, plus "update your card" banner |
| `lapsed` | was a member; now `canceled` / `unpaid` / `incomplete_expired` | no (read-only cloud) |

The status is a **pure function** `deriveMembership(authUser, userDoc)` in
`domain/membership.ts`, unit-tested on its own. The store only wires the
inputs (auth state + an `onSnapshot` on `users/{uid}`) and exposes:

- `status`, `memberSince`, `renewsAt` (for the Settings card)
- **capabilities**: `canSync`, `canSubscribe` (web, not member), `canManageBilling`
  (has a Stripe customer, web), `canSeeFullStats` (future gate), `needsCardUpdate`

UI reads capabilities only — never raw Stripe/Firestore fields. Nothing is
persisted: on launch a signed-in user is `checking` until the first snapshot
(Firestore's offline cache answers instantly when it has the doc).

### Server side

- The webhook writes a richer, still server-only user doc:
  `{ subscriptionStatus, cloudSync, memberSince, currentPeriodEnd, stripeCustomerId, updatedAt }`.
- `cloudSync` = status ∈ {active, trialing, **past_due**} — past_due keeps sync
  on during Stripe's retry window (today it cuts sync off on the first failed card).
- Firestore rules keep gating writes on `cloudSync == true`; reads stay owner-only.

### What it removes

`account.entitled` (and its persistence), `account.cloudSyncEnabled`,
`fetchEntitlement`, `refreshEntitlement`, `awaitCheckoutEntitlement` polling,
`refreshCurrentEntitlement`. The checkout return just shows "Confirmando tu
pago…" until the live status flips to `member` (with a timeout message).

## 2. Storage layer (`lib/storage/`)

### Backends

- **LocalBackend** — today's behavior: the sessions live in a persisted Pinia slot.
- **CloudBackend** — `users/{uid}/sessions/{id}` with Firestore's
  **persistent offline cache** (`persistentLocalCache` + `persistentMultipleTabManager`):
  works offline, queues writes, syncs across devices and tabs, live via
  `onSnapshot`. Each write carries `updatedAt: serverTimestamp()`.
  Conflicts: Firestore last-write-wins per document — same semantics as today,
  but ordered by the server, not device clocks.
- **House rules** follow the same split (`users/{uid}/settings/houseRules` for members).

### Sessions store shape

```ts
localSessions: Session[]   // persisted to localStorage — the LocalBackend
cloudSessions: Session[]   // in memory, fed by the Firestore listener
sessions = canSync ? cloudSessions : localSessions   // what the UI reads
```

Every mutating action (`createSession`, `addRound`, `updateRound`,
`deleteRound`, `finishSession`, `deleteSession`) builds the next session value
and hands it to the active backend's `save(session)` / `remove(id)`. For the
cloud backend the listener (fed instantly from the local cache) updates
`cloudSessions`, so the UI is optimistic and offline-capable for free.

### What it removes

`sessionStamps`, `deletedStamps`, `sessionOwners`, `adoptMerged`,
`applyRemote`, `claimSessions`, `releaseOwnership`, `mergeSessions`,
`partitionForAccount`, tombstones, `pushSessions`/`pushTombstones`, the sync
watcher and retry loop, and their tests (replaced, see §5).

## 3. Transitions (explicit, one-time copies)

Every move between backends is a deliberate, user-visible step — this is also
what fixes the shared-device problem properly.

| Transition | What happens |
|---|---|
| **Becomes a member** (or a member signs in on a device with offline games) | Prompt: "Hay N partidas en este dispositivo. ¿Subirlas a tu cuenta?" → yes: batch upload, then clear `localSessions`; no: they stay local and untouched. Never automatic — a borrowed device's games never land in the wrong account. |
| **Lapses** | Copy cloud games → `localSessions` (reads are still allowed), switch to local, banner "Tu suscripción terminó — tus partidas siguen en este dispositivo." Resubscribing offers the upload again. |
| **Signs out** (member) | Prompt: "¿Dejar una copia de tus partidas en este dispositivo?" (default yes on a personal device). Then terminate Firestore and **clear its offline cache** so the next person can't read it. |
| **Deletes account** | Server deletes everything (existing endpoint); offer the same "keep a copy here" choice; clear the cache. |
| **Payment fails** (`graceful`) | Nothing moves; banner with "Actualizar tarjeta" → Stripe portal. |

Copies are idempotent (keyed by session id), so a retry after a failure is safe.

## 4. Sync status in the UI

Derived from Firestore snapshot metadata + connectivity, exposed by the
storage layer (not a hand-maintained flag):

- **Guardado** — no pending writes
- **Guardando…** — `hasPendingWrites`
- **Sin conexión — se guardará al volver** — offline with pending writes

Shown in the home banner and the Settings Club card, replacing the static
"Todo guardado en la nube".

## 5. Testing

- **Pure unit tests:** `deriveMembership` (every status transition),
  transition decisions (what to copy, when to prompt).
- **Backend contract tests:** one suite run against LocalBackend and against
  CloudBackend on the **Firestore emulator** (save / remove / listener / offline queue).
- **Security rules tests** with `@firebase/rules-unit-testing`: owner-only reads,
  writes require `cloudSync`, user doc never client-writable.
- **Webhook tests:** status mapping incl. `past_due` grace.
- **Manual matrix** (emulators, two browsers): subscribe with offline games,
  second device live updates, lapse → local copy, sign-out keep/clear copy,
  shared device with two accounts, offline edits then reconnect, multiple tabs.

## 6. Phases

Each phase leaves the app working.

**Status (2026-10):** phases 1–4 implemented; phase 5 partly (pure unit tests
only). Where things live: `domain/membership.ts` (status + capabilities),
`stores/membership.ts`, `stores/sync.ts` (save state, import prompt),
`stores/sessions.ts` (local/cloud slots + injected `CloudWriter`),
`lib/cloudBackend.ts` (Firestore I/O), `lib/cloud.ts` (pure helpers),
`lib/sync.ts` (the driver), `lib/auth.ts` (identity + sign-out/deletion),
`composables/useAccountActions.ts` (keep-a-copy prompts).
Open-question defaults applied: sign-out asks with "keep" as the default;
`past_due` keeps sync on; lapsed users get the device copy only.
Still to do for phase 5: `@firebase/rules-unit-testing` rules tests, emulator
contract tests for the cloud backend, a webhook test runner in `firebase/functions`,
and the manual matrix.

1. **Membership** — `domain/membership.ts` + `stores/membership.ts`, webhook
   enrichment + `past_due` grace, live listener; UI switched to capabilities;
   polling and persisted `entitled` removed. *(Sync engine untouched for now.)*
2. **Cloud backend** — Firestore offline cache in `lib/firebase.ts`,
   `lib/storage/` backends, sessions store split into local/cloud slots,
   house rules on the same split.
3. **Transitions** — upload prompt, lapse copy-down, sign-out keep/clear,
   deletion; then **delete the old sync engine** and its bookkeeping.
4. **Sync status UI** — banner + Settings driven by real write state.
5. **Tests** — rules tests, emulator contract tests, the manual matrix.
6. **Brand redesign + dashboard polish** (club-conversion Phase 1c) — on the
   new architecture. *Needs the logo.*

Out of scope here, tracked in club-conversion: native sign-in plugin + native
purchases (Phase 3), stats gating (Phase 4), game nights (Phase 5).

## Risks

- **Clearing the Firestore cache** requires `terminate()` then
  `clearIndexedDbPersistence()` and re-initializing Firestore — `lib/firebase.ts`
  must hand out the current instance instead of a module-level constant. Verify early (phase 2).
- **Offline cache inside the Capacitor WebViews** (IndexedDB in WKWebView /
  Android WebView) — verify on devices before launch.
- **Whole-document last-write-wins:** two devices editing the *same* session
  offline → one edit wins. Same as today; if it matters later, move rounds to a
  subcollection so edits to different rounds don't collide.
- **Lapse detection needs the app open** to copy down — fine, because reads stay
  allowed after a lapse, so the copy can happen whenever the app next opens.

## Open questions

- [ ] Sign-out default: keep a local copy (personal phone) or not (shared tablet)? Plan assumes "ask, default keep".
- [ ] `past_due` grace: keep sync on for Stripe's whole retry window (plan assumes yes)?
- [ ] Should lapsed users keep *read-only* access to cloud stats, or only the local copy?
