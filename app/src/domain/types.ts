export type PlayerId = string
export type TeamId = 'A' | 'B'
export type PlayerCount = 4 | 6
export type SessionStatus = 'in_progress' | 'finished'

export type CanastaType =
  | 'clean'
  | 'dirty'
  | 'cleanAce'
  | 'dirtyAce'
  | 'cleanDeuce'
  | 'joker'
  | 'monkey'

export interface Player {
  id: PlayerId
  name: string
}

export interface TeamRoundEntry {
  exactCut: boolean
  misdeal: boolean
  honors: number
  canastas: Record<CanastaType, number>
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
  date: string
  playerCount: PlayerCount
  /** Clockwise seat order. */
  players: Player[]
  manoId: PlayerId
  initialDealerId: PlayerId
  plannedGames: number
  games: Game[]
  status: SessionStatus
}
