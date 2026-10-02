# Business Model — Anota Canaston

## Target Audience

40+ year old women from Latin America, middle-upper class. They play Canastón
as a social ritual — card night with friends, wine, and conversation. Many
participate in semi-organized tournaments at clubs, homes, or social groups.

---

## Revenue Streams

Two independent revenue streams, not bundled:

1. **Club subscription** — recurring, for individual players who want persistence
2. **Tournament service** — per-event fee, for organizers who run group events

---

## Tiers

### 🆓 Free — "Mesa" (The Table)

Everything needed to score a casual game, zero friction.

- Full scoring functionality, unlimited sessions
- All game rules, validation, rotation logic
- Data lives in **localStorage only** — persists on the device until
  cleared, but never leaves it
- No account required, no signup, no email
- Badges & achievements earned and viewable locally

**Why it works:** The scoring app is the hook. It must be excellent and
completely free so there's no hesitation at the table ("bajá la app y anotá
vos"). The paying features add *convenience and memory*, not core function.

**Conversion hooks:**
- "Tu partida terminó — ¿guardarla para siempre?" prompt after a session ends
- Achievement unlocked → "Sincronizá para no perder tus insignias"
- "3 partidas sin guardar" subtle badge on home screen
- After a phone change / app reinstall → empty state with "¿Tenías partidas? Con Club no las perdés"

---

### 💎 Club — $3.99/mo · $34.99/yr

For the regular player who wants her history and stats preserved.

- **Cloud sync** — Firebase Auth + Firestore, sessions persist across
  devices and survive reinstalls
- **Player directory** — persistent player profiles, name autocomplete,
  avatars
- **History & stats** — lifetime win rates, personal records, head-to-head
  matchups, streaks, per-player scoring averages
- **Export & share** — PDF/image session summary, WhatsApp-ready for the
  group chat
- **Badges synced** — achievements persist across devices, visible on profile
- **Priority support** (email)

**Who pays:** The dedicated player who plays weekly and wants to see her
stats grow over time. "Llevo 47 victorias" is the feeling we're selling.

---

### 🏆 Tournament Service — "Torneo" ($4.99 per event)

A standalone paid service for organizers. Completely separate from the Club
subscription — you can organize a tournament without being a Club member
(though you do need an account to create one).

**What the organizer gets:**

- **Tournament creation wizard** — name, date, max players, number of tables,
  rounds, rotation format (Swiss / round-robin / custom)
- **Invite system** — generates a join link + QR code; one tap to share via
  WhatsApp
- **Sign-up management** — registration page, player cap, waitlist,
  approval/auto-accept, registration deadline
- **Automatic rotation** — system assigns players to tables and partnerships
  each round based on chosen format
- **Live leaderboard** — real-time standings across all tables, visible to
  all participants on their phones
- **Final standings & podium** — animated results, shareable summary image
- **Tournament archive** — past events saved in organizer's account

**What participants get (free, no account needed):**

- Scan QR / tap link → enter display name → joined
- See their table assignment, partnership, round schedule
- Score their table normally (same round-entry UI they already know)
- View live leaderboard
- Earn tournament badges (stored locally or synced if Club member)

**Pricing rationale:** Per-event avoids subscription fatigue for something
episodic (1–4x per month). $4.99 is trivial relative to the event cost
(snacks, drinks, venue). The organizer pays once, 12–24 players benefit.

---

## Growth & Viral Mechanics

### The Tournament Flywheel

```
Organizer pays $4.99
       ↓
Creates tournament, shares QR in WhatsApp group
       ↓
12–24 women download the app to participate (free)
       ↓
They start using it for casual weekly games (free)
       ↓
Some want their stats saved → Club ($3.99/mo)
       ↓
Some become organizers themselves → new tournaments ($4.99)
       ↓
Their WhatsApp groups get the QR → new players download...
```

**Key insight:** The tournament is both a product AND a user acquisition
channel. Every tournament is a mini-launch event that brings 12–24 new users
at near-zero CAC.

### Organic sharing moments

- Session summary → "Mirá cómo les ganamos" → WhatsApp share
- Badge earned → share card to stories/group chat
- Tournament leaderboard → screenshot-worthy mid-event tension
- "Bajá Anota Canaston" is the answer to "¿quién anota?"

---

## Tournament Technical Architecture

### Separate service, not an extension of local sessions

The tournament is a **server-coordinated experience** that wraps the existing
local scoring engine:

- Tournament state lives in Firestore (document per tournament)
- Participants connect via a lightweight realtime listener (no heavy SDK
  required for free participants — anonymous Auth or just a session token)
- Each table's scoring is a normal local `Session` that reports results back
  to the tournament document on round completion
- Leaderboard computed by a Cloud Function (triggered on score submission)
  or client-side from all linked results
- Offline-tolerant: if a table loses wifi, they score locally and sync
  results when connectivity returns

### Data model sketch

```
tournaments/{id}
  ├── name, date, format, maxPlayers, status
  ├── organizerId
  ├── participants/  (subcollection)
  │   └── {playerId}: { name, joinedAt, approved }
  ├── rounds/  (subcollection)
  │   └── {roundNumber}: { tables: [...assignments], status }
  └── results/  (subcollection)
      └── {tableId_round}: { sessionId, scores, submittedAt }
```

### Payment flow

- Organizer taps "Create Tournament" → paywall (Apple IAP / Google Play
  Billing / Stripe for web)
- Single non-consumable purchase per event ($4.99)
- On successful payment → tournament document created, QR generated
- RevenueCat as the abstraction layer across platforms

---

## Implementation Priority

| Phase | What | Dependency |
|-------|------|-----------|
| A | Firebase Auth + basic account system | — |
| B | Cloud sync for sessions (Club foundation) | A |
| C | Player directory + stats/history | B |
| D | Badges & achievements (local-first) | — |
| E | Badge cloud sync | B + D |
| F | Payment integration (RevenueCat / Stripe) | A |
| G | Tournament MVP (create, join via QR, score, leaderboard) | A + F |
| H | Tournament polish (rotation algorithms, waitlist, export) | G |

Phases A–D can be developed in parallel tracks. Tournament (G–H) is the
biggest lift but also the biggest growth lever.

---

## Open Questions

- [ ] Club pricing: $3.99 or $2.99? A/B test with early users
- [ ] Tournament bundle for frequent organizers? (5 for $19.99?)
- [ ] Should free users see partial stats (last 5 sessions) as a teaser?
- [ ] Tournament spectator mode? (non-players watch the leaderboard live)
- [ ] WhatsApp bot for tournament notifications? (future, high effort)
- [ ] Referral: "Invitá una amiga a Club, recibí un mes gratis"?
- [ ] Corporate/club tier? (unlimited tournaments for a venue, monthly fee)
