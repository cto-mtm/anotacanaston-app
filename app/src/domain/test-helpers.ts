import type { CanastaType, TeamRoundEntry } from './types'

const EMPTY_CANASTAS: Record<CanastaType, number> = {
  clean: 0,
  dirty: 0,
  cleanAce: 0,
  dirtyAce: 0,
  cleanDeuce: 0,
  joker: 0,
  monkey: 0,
}

export function makeEntry(overrides: Partial<TeamRoundEntry> = {}): TeamRoundEntry {
  const { canastas, ...rest } = overrides
  return {
    exactCut: false,
    misdeal: false,
    honors: 0,
    wentOut: false,
    blackThreesBonus: false,
    meldedPoints: 0,
    handPoints: {},
    ...rest,
    canastas: { ...EMPTY_CANASTAS, ...canastas },
  }
}
