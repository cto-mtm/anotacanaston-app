# Gamification — Anota Canaston

## Philosophy

Badges and achievements should feel like inside jokes among players — rooted
in the game's vocabulary, not generic "Level 5!" gamification. They reward
memorable moments at the table ("¿Te acordás cuando saqué los 8 honores?")
and give the group chat something to screenshot.

Earned locally with no account. Cloud sync (Club tier) preserves them across
devices. Never gated behind a paywall — the upgrade pitch is persistence,
not access.

---

## Badge Categories

### 🎯 Primeros Pasos (Getting Started)

| Badge | Name | Condition |
|-------|------|-----------|
| 🃏 | Primera Mesa | Complete your first session |
| 📝 | Anotadora | Score 10 rounds total |
| 🗓️ | Habitual | Play on 5 different days |
| 👥 | Cuarteto | Play with 4 different players |
| 👥👥 | Sexteto | Complete a 6-player session |

### 🔥 Rachas & Victorias (Streaks & Wins)

| Badge | Name | Condition |
|-------|------|-----------|
| ✌️ | Dulce Victoria | Win your first session |
| 🔥 | Racha de Tres | Win 3 sessions in a row |
| 💪 | Imbatible | Win 5 sessions in a row |
| 👑 | Reina de la Mesa | Win 10 sessions total |
| 🏅 | Cincuenta Victorias | Win 50 sessions total |
| ⚔️ | Remontada | Win a game after being 5,000+ points behind |

### 📊 Puntajes (Scoring Milestones)

| Badge | Name | Condition |
|-------|------|-----------|
| 💯 | Diez Mil | Score 10,000+ in a single game |
| 🚀 | Quince de Una | Reach 15,000 in a single round (game won in 1 round) |
| 📈 | Escaladora | Go from negative score to winning the game |
| 📉 | En el Pozo | Have a cumulative score below −1,000 |
| 🎯 | Ronda Perfecta | Score 5,000+ in a single round |

### 🃏 Canastas

| Badge | Name | Condition |
|-------|------|-----------|
| 🧹 | Primera Limpia | Close your first clean canasta |
| 🧹🧹 | Limpieza Total | Close 4+ clean canastas in one round |
| 🐒 | Monos Locos | Close a Mono canasta |
| 🦆 | Patos al Agua | Close a Patos canasta |
| 🃏 | Joker Canasta | Close a Joker canasta |
| 🏆 | Canastón | Trigger the 9-canasta bonus (+3,000) |
| 💎 | Super Canastón | Trigger the 12-canasta bonus (+5,000) |
| 🌈 | Coleccionista | Close at least one of every canasta type in a session |

### ✂️ Momentos Especiales (Special Moments)

| Badge | Name | Condition |
|-------|------|-----------|
| ✂️ | Corte Exacto | Land an exact cut |
| ✂️✂️ | Tijeras de Oro | Land 5 exact cuts total |
| 💀 | Mal Dada | Get a misdeal |
| 🎰 | Ocho Honores | Collect all 8 honors in a 6-player game |
| ❤️ | Seis Honores | Collect all 6 honors in a 4-player game |
| 🚪 | La Ida | Go out (la ida) 10 times total |
| 🖤 | Tres Negros | Earn the black threes bonus |

### 🏆 Torneos (Tournament — future)

| Badge | Name | Condition |
|-------|------|-----------|
| 🎪 | Participante | Join your first tournament |
| 🥇 | Campeona | Win a tournament |
| 🥈 | Subcampeona | Finish 2nd in a tournament |
| 🎪🎪 | Veterana | Participate in 10 tournaments |
| 👑 | Tricampeona | Win 3 tournaments |

---

## Progression & Difficulty Curve

```
Easy (first sessions)     Medium (weeks of play)     Hard (months/rare events)
──────────────────────    ──────────────────────     ─────────────────────────
Primera Mesa              Racha de Tres              Super Canastón
Dulce Victoria            Reina de la Mesa           Imbatible
Anotadora                 Diez Mil                   Ocho Honores
Primera Limpia            Canastón                   Quince de Una
Habitual                  Tijeras de Oro             Coleccionista
                          Monos Locos                Tricampeona
                          Escaladora                 Cincuenta Victorias
```

Most players should earn 5–8 badges in their first month of casual play.
The hard badges are conversation starters ("¿Quién tiene el Super Canastón?").

---

## UX Design

### Profile Screen

- Grid layout, 4 columns
- Earned badges: full color + name + date earned
- Unearned badges: gray silhouette + hint text ("Ganá 3 partidas seguidas")
- Tap a badge → detail card with description + progress if applicable
- Total count shown at top: "14 de 32 insignias"

### Achievement Toast

- Appears after round save when a badge condition is met
- Animated slide-in from top, auto-dismiss after 4s
- Shows badge icon + name + "¡Logro desbloqueado!"
- Tap → navigates to profile

### Share

- Long-press a badge → share card (image) for WhatsApp/Instagram
- Card shows: badge icon, name, player name, date, app branding
- Club users: share directly; free users: share has subtle "Anota Canaston"
  watermark (not obtrusive, just branding)

---

## Technical Implementation

### Data Model

```typescript
interface Badge {
  id: BadgeId              // e.g. 'primera-mesa', 'super-canaston'
  earnedAt: string         // ISO date
}

// In stores/badges.ts
interface BadgesState {
  earned: Badge[]
}
```

### Computation

- Badge conditions checked after every `addRound` / `updateRound` /
  `finishSession` action
- Pure functions in `domain/badges.ts`: `checkBadges(sessions, currentBadges) → newlyEarned[]`
- No separate event tracking — all conditions derived from session data
- Idempotent: re-checking all sessions always produces the same badge set

### Persistence

- Local: same persistence plugin as sessions (`localStorage`)
- Cloud (Club): Firestore doc per user, `badges` subcollection
- Merge strategy: **union** — a badge once earned is never lost
- Conflict resolution: if local has badges not in cloud → upload them;
  if cloud has badges not in local → download them

### Performance

- Badge check runs on the full session list but most conditions are simple
  aggregations (counts, maxes) — fast even with 100+ sessions
- Expensive checks (like "Coleccionista" across all rounds) can be
  short-circuited once already earned
- Toast rendered via a global `<BadgeToast>` component in App.vue

---

## Open Questions

- [ ] Should badges have tiers (bronze/silver/gold) for graduated versions?
      e.g. "Win 10 / 25 / 50 sessions" as three tiers of the same badge
- [ ] Seasonal badges? ("Played during December" = holiday themed)
- [ ] Group badges? (Everyone at the table earns it together)
- [ ] Sound effect on badge unlock? (Consider the setting — card night
      ambiance)
