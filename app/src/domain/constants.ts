import type { CanastaType, PlayerCount, TeamId } from './types'

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
 * "dirty" allows up to 2. Used to sanity-check whether a combination of
 * rank-locked canastas (aces, deuces) is even possible given the cards
 * actually in the deck.
 */
export const MIN_NATURAL_CARDS_PER_CLEAN_CANASTA = 7
export const MIN_NATURAL_CARDS_PER_DIRTY_CANASTA = 5

/** A joker canasta is a fixed recipe, not "7 of a rank with wildcards". */
export const JOKER_CANASTA_JOKER_COUNT = 6
export const JOKER_CANASTA_DEUCE_COUNT = 1

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
