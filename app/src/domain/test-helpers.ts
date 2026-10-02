import type { CanastaType, Round, TeamRoundEntry } from './types'

const EMPTY_CANASTAS: Record<CanastaType, number> = {
  clean: 0,
  dirty: 0,
  cleanAce: 0,
  dirtyAce: 0,
  cleanDeuce: 0,
  dirtyDeuce: 0,
  joker: 0,
}

export function makeEntry(overrides: Partial<TeamRoundEntry> = {}): TeamRoundEntry {
  const { canastas, canastasEnMano, ...rest } = overrides
  return {
    exactCut: false,
    misdeal: false,
    badMelds: 0,
    tableTalk: 0,
    honors: 0,
    wentOut: false,
    blackThreesBonus: false,
    meldedPoints: 0,
    handPoints: {},
    ...rest,
    canastas: { ...EMPTY_CANASTAS, ...canastas },
    canastasEnMano: { ...EMPTY_CANASTAS, ...canastasEnMano },
  }
}

/** Creates a Round with an empty C entry by default. */
export function makeRound(entries: { A: TeamRoundEntry; B: TeamRoundEntry; C?: TeamRoundEntry }): Round {
  return { entries: { A: entries.A, B: entries.B, C: entries.C ?? makeEntry() } }
}
