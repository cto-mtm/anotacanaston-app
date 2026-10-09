export type PlayerId = string
export type TeamId = 'A' | 'B' | 'C'
export type PlayerCount = 4 | 6
export type SixPlayerFormat = '2x3' | '3x2'
export type SessionStatus = 'in_progress' | 'finished'

export type CanastaType =
  | 'clean'
  | 'dirty'
  | 'cleanAce'
  | 'dirtyAce'
  | 'cleanDeuce'
  | 'dirtyDeuce'
  | 'joker'

/**
 * How the individual session tally is computed:
 * - `roundedThousands`: each game's team totals are rounded to the nearest
 *   thousand and every player gets their team's rounded difference against
 *   each opposing team (16 vs 14 → +2 / −2). Summed across the games.
 * - `rawPoints`: each player gets their team's raw game total, summed.
 */
export type SessionScoringMethod = 'roundedThousands' | 'rawPoints'

/** Scoring values that vary between groups — see domain/rules.ts. */
export interface HouseRules {
  canastaValues: Record<CanastaType, number>
  canastonThreshold: number
  canastonBonus: number
  superCanastonThreshold: number
  superCanastonBonus: number
  /** Points (positive) subtracted per penalty: misdeal, bad meld, table talk. */
  penaltyValue: number
  gameTarget: number
  sessionScoring: SessionScoringMethod
}

export interface Player {
  id: PlayerId
  name: string
}

export interface TeamRoundEntry {
  exactCut: boolean
  misdeal: boolean
  /** "Bajarse mal" — times the team melded incorrectly this round. */
  badMelds: number
  /** "Sugerir al compañero una jugada" — times a player suggested a play. */
  tableTalk: number
  honors: number
  canastas: Record<CanastaType, number>
  /** "En mano" canastas — melded straight from hand, worth 2x the base value.
   * Same types as `canastas`; counts here score double but otherwise behave
   * identically (la ida, honors bracket, canastón count). */
  canastasEnMano: Record<CanastaType, number>
  wentOut: boolean
  blackThreesBonus: boolean
  meldedPoints: number
  handPoints: Record<PlayerId, number>
}

export interface Round {
  entries: Record<TeamId, TeamRoundEntry>
}

export interface Game {
  partnership: Record<TeamId, PlayerId[]>
  dealerId: PlayerId
  manoId: PlayerId
  rounds: Round[]
}

export interface Session {
  id: string
  /** The game-night date the players picked (YYYY-MM-DD). */
  date: string
  /** When the session was created (ms) — breaks ties between same-date sessions in lists. */
  createdAt: number
  playerCount: PlayerCount
  sixPlayerFormat?: SixPlayerFormat
  /** Clockwise seat order. */
  players: Player[]
  manoId: PlayerId
  initialDealerId: PlayerId
  plannedGames: number
  /** House rules snapshotted at creation — every score in the session uses these. */
  rules: HouseRules
  games: Game[]
  status: SessionStatus
}
