import type { CanastaType, PlayerCount } from './types'

export const CANASTA_VALUES: Record<CanastaType, number> = {
  clean: 500,
  dirty: 300,
  cleanAce: 1000,
  dirtyAce: 500,
  cleanDeuce: 2000,
  joker: 5000,
  monkey: 4000,
}

/** Canasta types that count as "clean" for the honors matrix and la ida validity. */
export const CLEAN_CANASTA_TYPES: readonly CanastaType[] = [
  'clean',
  'cleanAce',
  'cleanDeuce',
  'joker',
  'monkey',
]

/** Canasta types that count as "dirty" for the honors matrix and la ida validity. */
export const DIRTY_CANASTA_TYPES: readonly CanastaType[] = ['dirty', 'dirtyAce']

export const ALL_CANASTA_TYPES: readonly CanastaType[] = [
  ...CLEAN_CANASTA_TYPES,
  ...DIRTY_CANASTA_TYPES,
]

export const GAME_TARGET = 15_000

export const EXACT_CUT_BONUS = 500
export const MISDEAL_PENALTY = -500

export const GOING_OUT_POINTS = 300
export const BLACK_THREES_BONUS_POINTS = 300

export const CANASTON_THRESHOLD = 9
export const CANASTON_BONUS = 3_000
export const SUPER_CANASTON_THRESHOLD = 12
export const SUPER_CANASTON_BONUS = 5_000

/** Only this many red threes exist in the deck, per player count. */
export const MAX_HONORS: Record<PlayerCount, number> = { 4: 6, 6: 8 }

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
