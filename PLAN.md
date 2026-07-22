# Anota Canaston — Development Plan

> **How to execute this plan:** open a new Claude Code conversation in this folder and say:
> *"Execute PLAN.md phase by phase."*
>
> **Execution notes for the implementing agent (read first):**
> 1. Before writing any file, READ IN FULL [docs/specs/boilerplate-prompt.md](docs/specs/boilerplate-prompt.md) — it prescribes the exact file tree, package versions, router View-Transition wrapper, i18n module format, CORS list, emulator scripts, CLAUDE.md/README content. This plan only describes what to build ON TOP of it; the boilerplate spec is the source of truth for scaffolding details.
> 2. The game rules to implement are in [docs/specs/house-rules.md](docs/specs/house-rules.md) (AUTHORITATIVE). `rules.txt` is standard Canastone for background only — where they differ, house-rules.md wins.
> 3. Follow the phases in order; each phase ends with a git commit. Run `npm install` (app + firebase/functions) at the start of Phase 1, and keep `npm run test` green from then on.
> 4. Score math lives ONLY in `app/src/domain/` — components and stores must never re-implement a formula; they call the engine. If a formula seems ambiguous, the "Rule interpretations" section below is the decision — do not re-derive from rules.txt.
> 5. The "Consciously excluded" list below is intentional — do not add those rules.

## Context

Build **Anota Canaston**, a scorekeeper app for the card game Canastón (house-rules Italian Canasta), from scratch in this folder. The architecture is prescribed by the boilerplate spec: Vue 3 + Vite + TypeScript strict + Tailwind 4 + Pinia + vue-router with a View Transitions wrapper + typed vue-i18n modules + Capacitor 7 (iOS/Android later) + Firebase Hosting/Functions with fully-offline emulator dev.

**Decisions made:** scaffold directly in this folder with `git init` + initial commit · app name "Anota Canaston", bundle id `com.anotacanaston.app` · locales es (authored) + en (typed `typeof es` fallback) · support 4 **and** 6 players · local-first: all game data in localStorage, Cloud Function stays the boilerplate `/health` demo only (no auth, no Firestore).

## Rule interpretations (assumptions baked into the engine)

- **Meld thresholds** use `<=` boundaries: ≤3,000→50 (clean-melds-only note), ≤5,000→90, ≤7,000→120, ≤10,000→160, ≤12,000→180, else 200. Negative cumulative scores fall in the first bracket.
- **Canastón/Super Canastón bonus** is non-stacking on total closed canastas: ≥12→+5,000, else ≥9→+3,000.
- **Clean vs dirty sets** (for the honors matrix and la ida validity): clean = {limpia, ases limpia, patos, joker canasta, mono}; dirty = {sucia, ases sucia}. One constant, easy to change.
- **Honors**: clean+dirty closed → 100/honor (1–3) or 200/honor (4+); only clean → 0; only dirty or none → −200/honor (1–3) or −400/honor (4+), extending to 7→−2,800, 8→−3,200 for 6-player.
- **No canastas closed**: the form still collects melded points + per-player hand points; the engine **negates the melded points** and shows a "Sin canastas: todo cuenta en contra" warning — no separate input field.
- **4-player rotation**: game 1 = chosen partnership; games 2–3 cover the remaining two pairings. Dealer and mano fixed for games 1–2; in game 3 the dealer moves one seat clockwise (skipping the mano — mano never deals, never moves).
- **6-player**: partnerships (2 teams of 3) assigned manually per game in the wizard, configurable game count; honors cap 8.
- **La ida** checked without ≥1 clean + ≥1 dirty → scored 0 + validation warning blocking save (overridable). Same for the 6-black-threes bonus without la ida.
- **Both teams ≥15,000 tied** → no winner yet, play another round. Session winner (`sessionWinner`) returns an array of PlayerIds to handle tied individual tallies.
- **Dealer/mano are tracked per GAME, not per round.** The house spec only defines their movement between partnership combinations; the app does not rotate the deal within a game.
- **Attribution hints (soft, not blocking):** exact cut belongs to the cutter's team (the dealer's right-hand opponent cuts); misdeal belongs to the dealer's team. The round form pre-highlights the corresponding team's checkbox but never hard-blocks.
- **Melded points include cards inside canastas** (canasta bonuses are in addition to card values) — shown as a hint under the field.

## Cross-team round validations (`validateRound(round, playerCount)` in scoring.ts)

Per-team checks return `violations` from `scoreRound`; these ROUND-level checks compare both entries and surface in the form before save (blocking, with explicit override):

1. `honors_A + honors_B ≤ 6` (4-player) / `≤ 8` (6-player) — only that many red threes exist in the deck. Per-team honors also individually capped at the same max (`honorsOverMax`).
2. At most ONE team has `wentOut` (only one player closes a round).
3. At most ONE team has `exactCut` (there is one cutter per deal).
4. At most ONE team has `misdeal` (there is one dealer per deal).

## Consciously excluded (present in rules.txt, NOT in the house rules — do not implement)

- Doubling of negative hand points for a team that never made its opening meld.
- −500 penalty per red three found in a player's hand at round end.
- The 5-canasta extra bonuses (+1,000 / +2,000) — replaced by the house Canastón (9→+3,000) / Super Canastón (12→+5,000).
- 12,000-point game target — the house target is 15,000.
- No-closing-bonus-when-stock-exhausted bookkeeping — la ida is simply a checkbox the user leaves unchecked.

## Domain model (`app/src/domain/` — pure TS, zero Vue imports)

- `types.ts`: `Session { date, playerCount: 4|6, players (clockwise seat order), manoId, initialDealerId, plannedGames, games, status }` → `Game { partnership {A,B}, dealerId, manoId, rounds }` → `Round { entries: Record<'A'|'B', TeamRoundEntry> }` → `TeamRoundEntry { exactCut, misdeal, honors, canastas: Record<CanastaType, number>, wentOut, blackThreesBonus, meldedPoints, handPoints: Record<PlayerId, number> }`. CanastaType = `clean|dirty|cleanAce|dirtyAce|cleanDeuce|joker|monkey`.
- **Only raw entries are stored.** Round scores, cumulative totals, thresholds, winners, and per-player session tallies are always recomputed — editing a past round re-flows everything.
- `constants.ts`: canasta values (clean 500, dirty 300, cleanAce 1000, dirtyAce 500, cleanDeuce 2000, joker 5000, monkey 4000), `GAME_TARGET = 15_000`, honors matrix, threshold table, clean/dirty type sets.
- `scoring.ts`: `scoreRound(entry) → RoundScoreBreakdown { cut, misdeal, honors, canastas, countBonus, goingOut, melded, hand, total, violations }`, `validateRound(round, playerCount)` (cross-team checks above), plus `gameTotals`, `gameResult`, `meldThreshold(cumulative)`, `sessionTallies`, `sessionWinner`.
  - Formula reference: `cut = exactCut ? 500 : 0` · `misdeal = misdeal ? -500 : 0` · `honors` per matrix · `canastas = Σ count[t]·value[t]` · `countBonus = total≥12 ? 5000 : total≥9 ? 3000 : 0` · `goingOut = validIda ? 300 + (blackThreesBonus ? 300 : 0) : 0` · `melded = totalCanastas>0 ? +meldedPoints : -meldedPoints` · `hand = -Σ handPoints[p]`.
- `rotation.ts`: `buildFourPlayerSchedule(players, manoId, dealerId, initialPartnership)` and the manual 6-player schedule builder.
- `schema.ts`: zod schemas mirroring the types (zod is already a boilerplate dep) — used by the persistence layer.

## Screens & routes

| Route | Page | Notes |
|---|---|---|
| `/` | HomePage | session-card list — **hero source** |
| `/sessions/new` | NewSessionWizard | steps: player count + date → names in seat order → tap mano (dealer auto = mano's left, overridable) → partnerships (4p: pick mano's partner, preview 3-game schedule; 6p: assign teams + game count) |
| `/sessions/:id` | SessionDetailPage | **hero target**; games grid, live individual tallies |
| `/sessions/:id/games/:g` | GamePage | scoreboard, per-team **meld-threshold banners** (with "solo limpias" note at 50), collapsible pilón-triado info, round history (`<TransitionGroup>` Recipe 4) |
| `…/rounds/new`, `…/rounds/:r` | RoundEntryPage | two team panels (tabs on mobile): checkboxes, honors stepper, canasta-type counters, melded points, per-player hand points (all numeric fields use `inputmode="numeric"` for fast table-side entry); **live score-breakdown preview** via `scoreRound` before saving; per-team + cross-team validation warnings |
| `/sessions/:id/summary` | SessionSummaryPage | individual tallies, winner podium, per-game matrix |
| `/rules` | RulesPage | thresholds table · honors matrix · canasta values · **card point values table** (joker 50, as/pato 20, 8–K 10, 3–7 5, 3 negro 5) · going-out restrictions (need ≥1 limpia + ≥1 sucia; cannot discard 3 negro/pato/joker to go out) · black threes note (stop cards, never melded) · pilón triado note |
| `/about` | AboutPage | kept from boilerplate — `/health` emulator proof |

The boilerplate's mandatory hero-transition demo is fulfilled by the real app: `SessionCard` block/title carry `viewTransitionName: 'session-' + id` / `'session-title-' + id`, matched on SessionDetailPage.

Components: `SessionCard`, `ScoreboardHeader`, `ThresholdBanner`, `TeamRoundForm`, `CanastaCounter`, `PlayerPicker`, `PartnershipPicker`, `ScorePreview` + boilerplate's `AppShell` (nav: Partidas / Reglas / Acerca), `LocaleSwitcher`, `BaseButton`.

## Stores & persistence

- `stores/sessions.ts`: state = raw `Session[]`; getters delegate to the engine (`gameTotals`, `thresholds`, `tallies`); actions `createSession` (builds schedule via rotation.ts), `addRound`, `updateRound`, `deleteRound`, `advanceGame`, `finishSession`, `deleteSession`.
- `lib/persistence.ts`: small generic Pinia plugin — on init, read `localStorage['anotacanaston.<storeId>.v<version>']`, validate with zod (on failure: back up raw string to `.corrupt` key, start clean); debounced (300 ms) `$subscribe` writes; version + migrate hook.
- `stores/settings.ts`: persisted locale + last-open session.

## i18n

Per-feature typed modules (es authored, `en: typeof es`): `locales/configs/common.ts`, `locales/configs/game.ts` (the whole vocabulary: mano, pilón triado, patos, monos, la ida, corte exacto, mal dada, honores, canasta types as a nested `canastaType.*` object resolved data-driven), `locales/components/shell.ts`, `locales/pages/{home,newSession,gameScreen,roundEntry,summary,rules,about,notFound}.ts`. Dates via `d(date,'short')`.

## Implementation phases (each ends in a commit)

1. **Phase 0 — Boilerplate scaffold**: `git init`; produce the full boilerplate file tree exactly per spec (CLAUDE.md, README, docs/, app/, firebase/ incl. functions with `/health` + `/echo`, deploy script, .gitignore) with real name/bundle-id substituted. Includes the item-demo hero so the baseline is spot-checkable. Commit.
2. **Phase 1 — Domain engine + tests**: `domain/{constants,types,schema,scoring,rotation}.ts` + Vitest (`vitest` devDep only, node env) with the full test matrix: honors table incl. 7–8 honors and type-set edge cases (clean via patos-only, dirty via dirty-aces-only), canasta values, count-bonus boundaries (8/9/11/12/13), la ida validity, no-canastas negation (e.g. mesa 240, manos 35+50, 1 honor → −525), threshold boundaries (−500/0/3,000/3,005/5,005/7,005/10,005/12,005/14,995), game end incl. tie, cross-team `validateRound` cases (honors sum 4+3 in 4p → invalid; both wentOut → invalid), 4p rotation properties (3 games = 3 distinct pairings, mano constant, dealer moves only in game 3 and skips mano), session tallies. Green before commit.
3. **Phase 2 — Stores + persistence**: `lib/persistence.ts`, `stores/sessions.ts`, `stores/settings.ts`, register plugin in `main.ts`.
4. **Phase 3 — i18n content**: all locale modules + `i18n/index.ts` assembly.
5. **Phase 4 — Screens**: all pages/components above; new route map; delete demo `stores/items.ts`, `ItemCard.vue`, `ItemDetailPage.vue`; retarget `transitions.css` hero recipe to `session-*`; AppShell nav.
6. **Phase 5 — Rules page + polish**: RulesPage content, ThresholdBanner → RulesPage link, empty states, reduced-motion audit, update `docs/animations.md` example to the session hero.
7. **Phase 6 — Verification + final commit.**

Per the boilerplate: don't run builds during Phase 0 scaffolding — but Phases 1+ need `npm install` + Vitest to verify, so installs happen once at the start of Phase 1 (deviation from the boilerplate's "files only" rule is intentional and limited to making tests runnable).

## Verification

1. `cd app && npm run test` — engine test matrix is the acceptance suite for every formula.
2. `npm run build` in `app/` (vue-tsc proves strict mode + en/es key parity) and in `firebase/functions/`.
3. Manual E2E (two terminals: `firebase → npm run emulators`, `app → npm run dev`):
   - `/about` returns `{ok:true}` from the emulated function.
   - Create 4p session (mano Ana, partner Caro) → wizard previews 3 games with correct dealer/mano rotation.
   - Hero morph home → detail (Chromium).
   - Round entry sanity check: Team A corte exacto + 4 honores + 2 limpias + 1 sucia + la ida + 850 mesa = **3,750**; Team B 2 honores + 1 sucia + 320 mesa − 105 manos = **115**; threshold banner flips 50→90 for team A.
   - No-canastas round: mesa 240, manos 85, 1 honor → **−525** with warning banner.
   - La ida with only clean canastas → blocked with warning; honors 4 + 3 across teams in a 4p game → blocked (only 6 red threes exist); both teams marked la ida → blocked.
   - Play to ≥15,000 → game finishes → rotation to next game → after game 3, summary shows individual tallies + winner.
   - Reload restores from localStorage; editing an old round re-flows all totals.
   - es/en toggle everywhere; reduced-motion → instant navigation.
