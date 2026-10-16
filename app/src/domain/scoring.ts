import {
  ALL_CANASTA_TYPES,
  CLEAN_CANASTA_TYPES,
  DIRTY_CANASTA_TYPES,
  BLACK_THREES_BONUS_POINTS,
  CARD_POINT_STEP,
  EXACT_CUT_BONUS,
  GOING_OUT_POINTS,
  JOKER_CANASTA_DEUCE_COUNT,
  JOKER_CANASTA_JOKER_COUNT,
  MAX_HONORS,
  MELD_THRESHOLDS,
  MELD_THRESHOLD_DEFAULT,
  MIN_NATURAL_CARDS_PER_CLEAN_CANASTA,
  MIN_NATURAL_CARDS_PER_DIRTY_CANASTA,
  teamsForGame,
  totalAces,
  totalDeuces,
  totalJokers,
} from './constants'
import type {
  CanastaType,
  Game,
  HouseRules,
  PlayerCount,
  PlayerId,
  Round,
  Session,
  TeamId,
  TeamRoundEntry,
} from './types'

export type RoundViolationCode =
  | 'invalidIda'
  | 'blackThreesWithoutIda'
  | 'honorsOverMax'
  | 'honorsSumOverMax'
  | 'multipleWentOut'
  | 'multipleExactCut'
  | 'multipleMisdeal'
  | 'pointsNotMultipleOfFive'

export interface RoundViolation {
  team?: TeamId
  code: RoundViolationCode
}

export interface RoundScoreBreakdown {
  cut: number
  misdeal: number
  /** Bad melds + table talk (the misdeal keeps its own line). */
  penalties: number
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
  return CLEAN_CANASTA_TYPES.some((t) => entry.canastas[t] > 0 || entry.canastasEnMano[t] > 0)
}

function hasDirty(entry: TeamRoundEntry): boolean {
  return DIRTY_CANASTA_TYPES.some((t) => entry.canastas[t] > 0 || entry.canastasEnMano[t] > 0)
}

function totalCanastas(entry: TeamRoundEntry): number {
  return ALL_CANASTA_TYPES.reduce((sum, t) => sum + entry.canastas[t] + entry.canastasEnMano[t], 0)
}

export type HonorsClosedKind = 'both' | 'cleanOnly' | 'other'

/** Which honors bracket a team is in, driven by its closed canastas — used
 * both to score a round and to render the honors matrix on the Rules page. */
export function honorsClosedKind(entry: TeamRoundEntry): HonorsClosedKind {
  const clean = hasClean(entry)
  const dirty = hasDirty(entry)
  if (clean && dirty) return 'both'
  if (clean && !dirty) return 'cleanOnly'
  return 'other'
}

export function honorsValueForKind(count: number, kind: HonorsClosedKind): number {
  if (count <= 0) return 0
  if (kind === 'cleanOnly') return 0
  if (kind === 'both') return count <= 3 ? count * 100 : count * 200
  return count <= 3 ? count * -200 : count * -400
}

function honorsValue(count: number, entry: TeamRoundEntry): number {
  return honorsValueForKind(count, honorsClosedKind(entry))
}

function countBonus(total: number, rules: HouseRules): number {
  if (total >= rules.superCanastonThreshold) return rules.superCanastonBonus
  if (total >= rules.canastonThreshold) return rules.canastonBonus
  return 0
}

function isValidIda(entry: TeamRoundEntry): boolean {
  return hasClean(entry) && hasDirty(entry)
}

export function scoreRound(entry: TeamRoundEntry, rules: HouseRules): RoundScoreBreakdown {
  const violations: RoundViolation[] = []
  const total = totalCanastas(entry)
  const values = rules.canastaValues

  const cut = entry.exactCut ? EXACT_CUT_BONUS : 0
  const misdeal = entry.misdeal ? -rules.penaltyValue : 0
  const penalties = -(entry.badMelds + entry.tableTalk) * rules.penaltyValue
  const honors = honorsValue(entry.honors, entry)
  const canastas = ALL_CANASTA_TYPES.reduce(
    (sum, t) => sum + entry.canastas[t] * values[t] + entry.canastasEnMano[t] * values[t] * 2,
    0,
  )
  const bonus = countBonus(total, rules)

  let goingOut = 0
  if (entry.wentOut && isValidIda(entry)) {
    goingOut = GOING_OUT_POINTS + (entry.blackThreesBonus ? BLACK_THREES_BONUS_POINTS : 0)
  } else {
    if (entry.wentOut) violations.push({ code: 'invalidIda' })
    if (entry.blackThreesBonus) violations.push({ code: 'blackThreesWithoutIda' })
  }

  const melded = total > 0 ? entry.meldedPoints : -entry.meldedPoints
  const hand = -Object.values(entry.handPoints).reduce((sum, p) => sum + p, 0)

  const roundTotal = cut + misdeal + penalties + honors + canastas + bonus + goingOut + melded + hand

  return {
    cut,
    misdeal,
    penalties,
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
export function validateRound(
  round: Round,
  playerCount: PlayerCount,
  rules: HouseRules,
  teams: TeamId[] = ['A', 'B'],
): RoundValidation {
  const violations: RoundViolation[] = []
  const maxHonors = MAX_HONORS[playerCount]

  for (const team of teams) {
    const entry = round.entries[team]
    const breakdown = scoreRound(entry, rules)
    for (const v of breakdown.violations) violations.push({ ...v, team })
    if (entry.honors > maxHonors) violations.push({ team, code: 'honorsOverMax' })
    // Every card is worth a multiple of 5, so any other total is a typo.
    const typed = [entry.meldedPoints, ...Object.values(entry.handPoints)]
    if (typed.some((p) => p % CARD_POINT_STEP !== 0)) violations.push({ team, code: 'pointsNotMultipleOfFive' })
  }

  const honorsSum = teams.reduce((sum, t) => sum + round.entries[t].honors, 0)
  if (honorsSum > maxHonors) violations.push({ code: 'honorsSumOverMax' })

  const wentOutCount = teams.filter((t) => round.entries[t].wentOut).length
  if (wentOutCount > 1) violations.push({ code: 'multipleWentOut' })

  const exactCutCount = teams.filter((t) => round.entries[t].exactCut).length
  if (exactCutCount > 1) violations.push({ code: 'multipleExactCut' })

  const misdealCount = teams.filter((t) => round.entries[t].misdeal).length
  if (misdealCount > 1) violations.push({ code: 'multipleMisdeal' })

  return { valid: violations.length === 0, violations }
}

export type CardSupplyWarningCode =
  | 'aceSupplyExceeded'
  | 'bothAceVariantsSameTeam'
  | 'deuceSupplyExceeded'
  | 'jokerSupplyExceeded'

export interface CardSupplyWarning {
  team?: TeamId
  code: CardSupplyWarningCode
}

/**
 * Non-blocking sanity check: is this combination of rank-locked canastas
 * (aces, deuces, jokers) even possible given how many decks are actually in
 * play (3 for 4 players, 4 for 6 players)?
 */
export function checkCardSupply(round: Round, playerCount: PlayerCount, teams: TeamId[] = ['A', 'B']): CardSupplyWarning[] {
  const warnings: CardSupplyWarning[] = []

  const count = (team: TeamId, type: CanastaType) =>
    round.entries[team].canastas[type] + round.entries[team].canastasEnMano[type]

  const cleanAceTotal = teams.reduce((sum, t) => sum + count(t, 'cleanAce'), 0)
  const dirtyAceTotal = teams.reduce((sum, t) => sum + count(t, 'dirtyAce'), 0)
  const minAcesNeeded =
    cleanAceTotal * MIN_NATURAL_CARDS_PER_CLEAN_CANASTA + dirtyAceTotal * MIN_NATURAL_CARDS_PER_DIRTY_CANASTA
  if (minAcesNeeded > totalAces(playerCount)) warnings.push({ code: 'aceSupplyExceeded' })

  for (const team of teams) {
    if (count(team, 'cleanAce') > 0 && count(team, 'dirtyAce') > 0) {
      warnings.push({ team, code: 'bothAceVariantsSameTeam' })
    }
  }

  const jokerCanastaTotal = teams.reduce((sum, t) => sum + count(t, 'joker'), 0)
  const cleanDeuceTotal = teams.reduce((sum, t) => sum + count(t, 'cleanDeuce'), 0)
  const dirtyDeuceTotal = teams.reduce((sum, t) => sum + count(t, 'dirtyDeuce'), 0)
  const minDeucesNeeded =
    cleanDeuceTotal * MIN_NATURAL_CARDS_PER_CLEAN_CANASTA +
    dirtyDeuceTotal * MIN_NATURAL_CARDS_PER_DIRTY_CANASTA +
    jokerCanastaTotal * JOKER_CANASTA_DEUCE_COUNT
  if (minDeucesNeeded > totalDeuces(playerCount)) warnings.push({ code: 'deuceSupplyExceeded' })

  const minJokersNeeded = jokerCanastaTotal * JOKER_CANASTA_JOKER_COUNT
  if (minJokersNeeded > totalJokers(playerCount)) warnings.push({ code: 'jokerSupplyExceeded' })

  return warnings
}

export function gameTotals(game: Game, rules: HouseRules): Record<TeamId, number> {
  const teams = teamsForGame(game.partnership)
  const totals: Record<TeamId, number> = { A: 0, B: 0, C: 0 }
  for (const round of game.rounds) {
    for (const team of teams) {
      totals[team] += scoreRound(round.entries[team], rules).total
    }
  }
  return totals
}

export interface GameResult {
  finished: boolean
  winner?: TeamId
}

export function gameResult(game: Game, rules: HouseRules): GameResult {
  const teams = teamsForGame(game.partnership)
  const totals = gameTotals(game, rules)

  const aboveTarget = teams.filter((t) => totals[t] >= rules.gameTarget)

  if (aboveTarget.length === 0) return { finished: false }

  // If multiple teams above target, highest wins; if tied, not finished yet
  const maxScore = Math.max(...aboveTarget.map((t) => totals[t]))
  const leaders = aboveTarget.filter((t) => totals[t] === maxScore)
  if (leaders.length > 1) return { finished: false }
  return { finished: true, winner: leaders[0] }
}

export function meldThreshold(cumulative: number): { points: number; cleanOnly: boolean } {
  for (const bracket of MELD_THRESHOLDS) {
    if (cumulative <= bracket.max) {
      return { points: bracket.points, cleanOnly: Boolean(bracket.cleanOnly) }
    }
  }
  return { points: MELD_THRESHOLD_DEFAULT, cleanOnly: false }
}

/**
 * A game's score rounded to the nearest thousand, in thousands (15,680 → 16,
 * 14,300 → 14). Halves round up.
 */
export function roundToThousands(points: number): number {
  return Math.round(points / 1_000)
}

/**
 * What each team contributes to its players' session tallies for one game.
 * `roundedThousands`: the team's rounded score minus each opponent's rounded
 * score, summed (2 teams: 16 vs 14 → +2 / −2; always zero-sum).
 * `rawPoints`: the team's raw game total.
 */
export function gameTallyPoints(game: Game, rules: HouseRules): Record<TeamId, number> {
  const teams = teamsForGame(game.partnership)
  const totals = gameTotals(game, rules)
  const points: Record<TeamId, number> = { A: 0, B: 0, C: 0 }

  if (rules.sessionScoring === 'rawPoints') {
    for (const team of teams) points[team] = totals[team]
    return points
  }

  for (const team of teams) {
    const own = roundToThousands(totals[team])
    points[team] = teams
      .filter((other) => other !== team)
      .reduce((sum, other) => sum + own - roundToThousands(totals[other]), 0)
  }
  return points
}

export function sessionTallies(session: Session): Record<PlayerId, number> {
  const { rules } = session
  const tallies: Record<PlayerId, number> = {}
  for (const player of session.players) tallies[player.id] = 0

  for (const game of session.games) {
    const points = gameTallyPoints(game, rules)
    for (const team of teamsForGame(game.partnership)) {
      for (const playerId of game.partnership[team]) {
        tallies[playerId] = (tallies[playerId] ?? 0) + points[team]
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
