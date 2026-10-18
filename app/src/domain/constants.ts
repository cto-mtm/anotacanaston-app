import type { CanastaType, CardCounts, CardGroup, PlayerCount, TeamId } from './types'

/** Point value per card group (jokers 50; aces and deuces 20; 8–K 10; 4–7 and black threes 5). */
export const CARD_POINTS: Record<CardGroup, number> = {
  joker: 50,
  aceOrDeuce: 20,
  high: 10,
  low: 5,
}

export const CARD_GROUPS: readonly CardGroup[] = ['joker', 'aceOrDeuce', 'high', 'low']

/** Every card is worth a multiple of this, so any valid points total is too. */
export const CARD_POINT_STEP = 5

export function emptyCardCounts(): CardCounts {
  return { joker: 0, aceOrDeuce: 0, high: 0, low: 0 }
}

export function cardPoints(counts: CardCounts): number {
  return CARD_GROUPS.reduce((sum, g) => sum + counts[g] * CARD_POINTS[g], 0)
}

// Canasta values, Canastón thresholds, penalties and the game target vary
// between groups — they live per session in rules.ts, not here.

/** Canasta types that count as "clean" for the honors matrix and la ida validity. */
export const CLEAN_CANASTA_TYPES: readonly CanastaType[] = [
  'clean',
  'cleanAce',
  'cleanDeuce',
  'joker',
]

/** Canasta types that count as "dirty" for the honors matrix and la ida validity. */
export const DIRTY_CANASTA_TYPES: readonly CanastaType[] = ['dirty', 'dirtyAce', 'dirtyDeuce']

export const ALL_CANASTA_TYPES: readonly CanastaType[] = [
  ...CLEAN_CANASTA_TYPES,
  ...DIRTY_CANASTA_TYPES,
]

export const EXACT_CUT_BONUS = 500

export const GOING_OUT_POINTS = 300
export const BLACK_THREES_BONUS_POINTS = 300

/** Standard decks used per session, by player count (per house rules). */
export const DECKS_PER_SESSION: Record<PlayerCount, number> = { 4: 3, 6: 4 }

const SUITS = 4
const RED_SUITS = 2 // hearts, diamonds
const JOKERS_PER_DECK = 2

/** Only this many red threes exist in the deck, per player count. */
export const MAX_HONORS: Record<PlayerCount, number> = {
  4: RED_SUITS * DECKS_PER_SESSION[4],
  6: RED_SUITS * DECKS_PER_SESSION[6],
}

/** Total aces across every deck in play (4 suits x decks). */
export function totalAces(playerCount: PlayerCount): number {
  return SUITS * DECKS_PER_SESSION[playerCount]
}

/** Total deuces (patos) across every deck in play (4 suits x decks). */
export function totalDeuces(playerCount: PlayerCount): number {
  return SUITS * DECKS_PER_SESSION[playerCount]
}

/** Total jokers across every deck in play (2 per deck). */
export function totalJokers(playerCount: PlayerCount): number {
  return JOKERS_PER_DECK * DECKS_PER_SESSION[playerCount]
}

/**
 * Minimum real (non-wildcard) cards of a rank a single canasta of that rank
 * consumes — a canasta is 7+ cards, and "clean" means zero wildcards while
 * "dirty" allows up to 2. Used by deckCardNeeds for ace canastas (canastas of
 * wildcards are counted with WILDCARD_CANASTA_SIZE instead).
 */
export const MIN_NATURAL_CARDS_PER_CLEAN_CANASTA = 7
export const MIN_NATURAL_CARDS_PER_DIRTY_CANASTA = 5

/** A joker canasta is a fixed recipe, not "7 of a rank with wildcards". */
export const JOKER_CANASTA_JOKER_COUNT = 6
export const JOKER_CANASTA_DEUCE_COUNT = 1

/** Cards in a canasta of wildcards (limpia de patos, sucia de monos, comodines). */
const WILDCARD_CANASTA_SIZE = 7

/** Cards by kind; `wildcards` is deuces and jokers together. */
export interface DeckCards {
  aces: number
  deuces: number
  jokers: number
  wildcards: number
}

/**
 * Minimum cards of each kind a set of canastas consumes. Any sucia (plain or
 * de ases) needs at least 1 wildcard (otherwise it's clean); a sucia de monos
 * is 7 wildcards with at least one deuce and one joker (otherwise it's a
 * limpia de patos or of jokers). Plain clean canastas consume nothing here.
 */
export function deckCardNeeds(counts: Partial<Record<CanastaType, number>>): DeckCards {
  const c = (type: CanastaType) => counts[type] ?? 0
  return {
    aces: c('cleanAce') * MIN_NATURAL_CARDS_PER_CLEAN_CANASTA + c('dirtyAce') * MIN_NATURAL_CARDS_PER_DIRTY_CANASTA,
    deuces: c('cleanDeuce') * WILDCARD_CANASTA_SIZE + c('joker') * JOKER_CANASTA_DEUCE_COUNT + c('dirtyDeuce'),
    jokers: c('joker') * JOKER_CANASTA_JOKER_COUNT + c('dirtyDeuce'),
    wildcards:
      (c('cleanDeuce') + c('dirtyDeuce') + c('joker')) * WILDCARD_CANASTA_SIZE + c('dirty') + c('dirtyAce'),
  }
}

export function deckCardSupply(playerCount: PlayerCount): DeckCards {
  const deuces = totalDeuces(playerCount)
  const jokers = totalJokers(playerCount)
  return { aces: totalAces(playerCount), deuces, jokers, wildcards: deuces + jokers }
}

/** Which kinds of card `needs` asks for more of than `supply` has. */
export function deckShortfalls(needs: DeckCards, supply: DeckCards): (keyof DeckCards)[] {
  return (Object.keys(needs) as (keyof DeckCards)[]).filter((kind) => needs[kind] > supply[kind])
}

/**
 * The most canastas of each type one team can close in a round (normal + en
 * mano combined) if it held every card of that kind in play. Plain clean
 * canastas use no rank-locked cards, so they're uncapped; plain dirty ones are
 * capped by the wildcard each needs. Combinations across types and teams
 * are checked separately by checkCardSupply, from the same deckCardNeeds model.
 */
export function maxCanastasPerTeam(playerCount: PlayerCount): Record<CanastaType, number> {
  return MAX_CANASTAS_PER_TEAM[playerCount]
}

function computeMaxCanastasPerTeam(playerCount: PlayerCount): Record<CanastaType, number> {
  const supply = deckCardSupply(playerCount)
  const max = (type: CanastaType) => {
    const perCanasta = deckCardNeeds({ [type]: 1 })
    // A type that consumes no counted cards can never run the deck out.
    if (Object.values(perCanasta).every((n) => n === 0)) return Number.POSITIVE_INFINITY
    let n = 0
    while (deckShortfalls(deckCardNeeds({ [type]: n + 1 }), supply).length === 0) n++
    return n
  }
  return Object.fromEntries(ALL_CANASTA_TYPES.map((type) => [type, max(type)])) as Record<CanastaType, number>
}

// Only two player counts exist, so compute the caps once instead of on every render.
const MAX_CANASTAS_PER_TEAM: Record<PlayerCount, Record<CanastaType, number>> = {
  4: computeMaxCanastasPerTeam(4),
  6: computeMaxCanastasPerTeam(6),
}

/**
 * Meld thresholds use <= boundaries against the team's cumulative score
 * BEFORE the round being scored. Negative cumulative scores fall in the
 * first bracket. `cleanOnly` on the first bracket means: no trios with
 * wildcards — only a clean run of 2s or a clean joker meld may use wilds.
 */
export const MELD_THRESHOLDS: ReadonlyArray<{ max: number; points: number; cleanOnly?: boolean }> = [
  { max: 3_000, points: 50, cleanOnly: true },
  { max: 5_000, points: 90 },
  { max: 7_000, points: 120 },
  { max: 10_000, points: 160 },
  { max: 12_000, points: 180 },
]
export const MELD_THRESHOLD_DEFAULT = 200

/** Returns the team IDs relevant for a given game based on which teams have players. */
export function teamsForGame(partnership: Record<TeamId, string[]>): TeamId[] {
  return (['A', 'B', 'C'] as const).filter((t) => partnership[t].length > 0)
}
