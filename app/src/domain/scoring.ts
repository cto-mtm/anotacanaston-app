import {
  ALL_CANASTA_TYPES,
  CANASTA_VALUES,
  CANASTON_BONUS,
  CANASTON_THRESHOLD,
  CLEAN_CANASTA_TYPES,
  DIRTY_CANASTA_TYPES,
  BLACK_THREES_BONUS_POINTS,
  EXACT_CUT_BONUS,
  GAME_TARGET,
  GOING_OUT_POINTS,
  MAX_HONORS,
  MELD_THRESHOLDS,
  MELD_THRESHOLD_DEFAULT,
  MISDEAL_PENALTY,
  SUPER_CANASTON_BONUS,
  SUPER_CANASTON_THRESHOLD,
} from './constants'
import type { Game, PlayerCount, PlayerId, Round, Session, TeamId, TeamRoundEntry } from './types'

const TEAM_IDS: readonly TeamId[] = ['A', 'B']

export type RoundViolationCode =
  | 'invalidIda'
  | 'blackThreesWithoutIda'
  | 'honorsOverMax'
  | 'honorsSumOverMax'
  | 'multipleWentOut'
  | 'multipleExactCut'
  | 'multipleMisdeal'

export interface RoundViolation {
  team?: TeamId
  code: RoundViolationCode
}

export interface RoundScoreBreakdown {
  cut: number
  misdeal: number
  honors: number
  canastas: number
  countBonus: number
  goingOut: number
  melded: number
  hand: number
  total: number
  violations: RoundViolation[]
}

function hasClean(entry: TeamRoundEntry): boolean {
  return CLEAN_CANASTA_TYPES.some((t) => entry.canastas[t] > 0)
}

function hasDirty(entry: TeamRoundEntry): boolean {
  return DIRTY_CANASTA_TYPES.some((t) => entry.canastas[t] > 0)
}

function totalCanastas(entry: TeamRoundEntry): number {
  return ALL_CANASTA_TYPES.reduce((sum, t) => sum + entry.canastas[t], 0)
}

function honorsValue(count: number, entry: TeamRoundEntry): number {
  if (count <= 0) return 0
  const clean = hasClean(entry)
  const dirty = hasDirty(entry)
  if (clean && dirty) return count <= 3 ? count * 100 : count * 200
  if (clean && !dirty) return 0
  return count <= 3 ? count * -200 : count * -400
}

function countBonus(total: number): number {
  if (total >= SUPER_CANASTON_THRESHOLD) return SUPER_CANASTON_BONUS
  if (total >= CANASTON_THRESHOLD) return CANASTON_BONUS
  return 0
}

function isValidIda(entry: TeamRoundEntry): boolean {
  return hasClean(entry) && hasDirty(entry)
}

export function scoreRound(entry: TeamRoundEntry): RoundScoreBreakdown {
  const violations: RoundViolation[] = []
  const total = totalCanastas(entry)

  const cut = entry.exactCut ? EXACT_CUT_BONUS : 0
  const misdeal = entry.misdeal ? MISDEAL_PENALTY : 0
  const honors = honorsValue(entry.honors, entry)
  const canastas = ALL_CANASTA_TYPES.reduce(
    (sum, t) => sum + entry.canastas[t] * CANASTA_VALUES[t],
    0,
  )
  const bonus = countBonus(total)

  let goingOut = 0
  if (entry.wentOut && isValidIda(entry)) {
    goingOut = GOING_OUT_POINTS + (entry.blackThreesBonus ? BLACK_THREES_BONUS_POINTS : 0)
  } else {
    if (entry.wentOut) violations.push({ code: 'invalidIda' })
    if (entry.blackThreesBonus) violations.push({ code: 'blackThreesWithoutIda' })
  }

  const melded = total > 0 ? entry.meldedPoints : -entry.meldedPoints
  const hand = -Object.values(entry.handPoints).reduce((sum, p) => sum + p, 0)

  const roundTotal = cut + misdeal + honors + canastas + bonus + goingOut + melded + hand

  return {
    cut,
    misdeal,
    honors,
    canastas,
    countBonus: bonus,
    goingOut,
    melded,
    hand,
    total: roundTotal,
    violations,
  }
}

export interface RoundValidation {
  valid: boolean
  violations: RoundViolation[]
}

/**
 * Cross-team checks: combines each team's scoreRound violations with the
 * round-level checks that require comparing both entries at once.
 */
export function validateRound(round: Round, playerCount: PlayerCount): RoundValidation {
  const violations: RoundViolation[] = []
  const maxHonors = MAX_HONORS[playerCount]

  for (const team of TEAM_IDS) {
    const entry = round.entries[team]
    const breakdown = scoreRound(entry)
    for (const v of breakdown.violations) violations.push({ ...v, team })
    if (entry.honors > maxHonors) violations.push({ team, code: 'honorsOverMax' })
  }

  const honorsSum = round.entries.A.honors + round.entries.B.honors
  if (honorsSum > maxHonors) violations.push({ code: 'honorsSumOverMax' })

  const wentOutCount = TEAM_IDS.filter((t) => round.entries[t].wentOut).length
  if (wentOutCount > 1) violations.push({ code: 'multipleWentOut' })

  const exactCutCount = TEAM_IDS.filter((t) => round.entries[t].exactCut).length
  if (exactCutCount > 1) violations.push({ code: 'multipleExactCut' })

  const misdealCount = TEAM_IDS.filter((t) => round.entries[t].misdeal).length
  if (misdealCount > 1) violations.push({ code: 'multipleMisdeal' })

  return { valid: violations.length === 0, violations }
}

export function gameTotals(game: Game): Record<TeamId, number> {
  const totals: Record<TeamId, number> = { A: 0, B: 0 }
  for (const round of game.rounds) {
    for (const team of TEAM_IDS) {
      totals[team] += scoreRound(round.entries[team]).total
    }
  }
  return totals
}

export interface GameResult {
  finished: boolean
  winner?: TeamId
}

export function gameResult(game: Game): GameResult {
  const totals = gameTotals(game)
  const aAbove = totals.A >= GAME_TARGET
  const bAbove = totals.B >= GAME_TARGET

  if (aAbove && bAbove) {
    if (totals.A === totals.B) return { finished: false }
    return { finished: true, winner: totals.A > totals.B ? 'A' : 'B' }
  }
  if (aAbove) return { finished: true, winner: 'A' }
  if (bAbove) return { finished: true, winner: 'B' }
  return { finished: false }
}

export function meldThreshold(cumulative: number): { points: number; cleanOnly: boolean } {
  for (const bracket of MELD_THRESHOLDS) {
    if (cumulative <= bracket.max) {
      return { points: bracket.points, cleanOnly: Boolean(bracket.cleanOnly) }
    }
  }
  return { points: MELD_THRESHOLD_DEFAULT, cleanOnly: false }
}

export function sessionTallies(session: Session): Record<PlayerId, number> {
  const tallies: Record<PlayerId, number> = {}
  for (const player of session.players) tallies[player.id] = 0

  for (const game of session.games) {
    const totals = gameTotals(game)
    for (const team of TEAM_IDS) {
      for (const playerId of game.partnership[team]) {
        tallies[playerId] = (tallies[playerId] ?? 0) + totals[team]
      }
    }
  }
  return tallies
}

/** Returns an array of PlayerIds to handle tied individual tallies. */
export function sessionWinner(session: Session): PlayerId[] {
  const tallies = sessionTallies(session)
  const entries = Object.entries(tallies)
  if (entries.length === 0) return []
  const max = Math.max(...entries.map(([, score]) => score))
  return entries.filter(([, score]) => score === max).map(([playerId]) => playerId)
}
