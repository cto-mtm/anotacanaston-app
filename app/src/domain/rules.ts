import type { HouseRules } from './types'

/**
 * The group-configurable scoring values. Everything else in the engine (card
 * values, honors matrix, la ida requirements, meld thresholds) is universal
 * and stays in constants.ts.
 *
 * Every session snapshots its own copy of these at creation, because only raw
 * entries are stored and scores are always recomputed — a single global
 * setting would silently rewrite the history of past sessions.
 */

/** Defaults for new sessions — the printed Canastón rule sheet. */
export const DEFAULT_RULES: HouseRules = {
  canastaValues: {
    clean: 500,
    dirty: 300,
    cleanAce: 1_000,
    dirtyAce: 500,
    cleanDeuce: 3_000,
    dirtyDeuce: 2_000,
    joker: 5_000,
  },
  canastonThreshold: 9,
  canastonBonus: 3_000,
  superCanastonThreshold: 11,
  superCanastonBonus: 5_000,
  penaltyValue: 500,
  gameTarget: 15_000,
  sessionScoring: 'roundedThousands',
}

/** Deep copy, so a session's snapshot never aliases the settings store. */
export function cloneRules(rules: HouseRules): HouseRules {
  return { ...rules, canastaValues: { ...rules.canastaValues } }
}
