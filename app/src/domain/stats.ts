// Cross-session statistics for the dashboard. Pure functions over raw
// sessions — like everything in domain/, nothing here is stored.
//
// Players have per-session ids, so the same person across sessions is matched
// by name (case-, accent- and whitespace-insensitive) until a real player
// directory exists (club-conversion plan, Phase 4).

import { teamsForGame } from './constants'
import { gameResult, gameTotals, sessionWinner } from './scoring'
import type { Session } from './types'

export type PlayerKey = string

/** "  María José " and "maria jose" are the same player. */
export function playerKey(name: string): PlayerKey {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export interface PlayerStats {
  key: PlayerKey
  /** The name as written in the most recent session. */
  name: string
  sessionsPlayed: number
  sessionWins: number
  gamesPlayed: number
  gameWins: number
  /** Consecutive finished sessions won, counting back from the latest. */
  currentStreak: number
  bestStreak: number
  lastPlayed: string
}

export interface PartnershipStats {
  names: [string, string]
  gamesTogether: number
  winsTogether: number
}

export interface GameRecord {
  points: number
  names: string[]
  date: string
  sessionId: string
}

export interface DashboardStats {
  totals: { sessions: number; finishedSessions: number; games: number; rounds: number }
  /** Sorted by session wins, then game wins, then sessions played. */
  players: PlayerStats[]
  /** Pairs who played together on the same team at least twice, most wins first. */
  partnerships: PartnershipStats[]
  /** Highest final game total any team reached. */
  bestGame: GameRecord | null
}

function byDate(a: Session, b: Session): number {
  return a.date.localeCompare(b.date)
}

export function computeDashboardStats(sessions: Session[]): DashboardStats {
  const ordered = [...sessions].sort(byDate)
  const players = new Map<PlayerKey, PlayerStats>()
  const pairs = new Map<string, PartnershipStats>()
  const totals = { sessions: ordered.length, finishedSessions: 0, games: 0, rounds: 0 }
  let bestGame: GameRecord | null = null

  function statsFor(name: string, date: string): PlayerStats {
    const key = playerKey(name)
    let stats = players.get(key)
    if (!stats) {
      stats = {
        key,
        name,
        sessionsPlayed: 0,
        sessionWins: 0,
        gamesPlayed: 0,
        gameWins: 0,
        currentStreak: 0,
        bestStreak: 0,
        lastPlayed: date,
      }
      players.set(key, stats)
    }
    stats.name = name.trim()
    stats.lastPlayed = date
    return stats
  }

  function recordPairs(names: string[], won: boolean) {
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const [a, b] = [names[i], names[j]].sort((x, y) => playerKey(x).localeCompare(playerKey(y)))
        const id = `${playerKey(a)}|${playerKey(b)}`
        const pair = pairs.get(id) ?? { names: [a, b] as [string, string], gamesTogether: 0, winsTogether: 0 }
        pair.names = [a.trim(), b.trim()]
        pair.gamesTogether += 1
        if (won) pair.winsTogether += 1
        pairs.set(id, pair)
      }
    }
  }

  for (const session of ordered) {
    const nameOf = (id: string) => session.players.find((p) => p.id === id)?.name ?? id
    const finished = session.status === 'finished'
    const winners = finished ? new Set(sessionWinner(session)) : new Set<string>()
    if (finished) totals.finishedSessions += 1

    for (const player of session.players) {
      const stats = statsFor(player.name, session.date)
      stats.sessionsPlayed += 1
      if (!finished) continue
      if (winners.has(player.id)) {
        stats.sessionWins += 1
        stats.currentStreak += 1
        stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak)
      } else {
        stats.currentStreak = 0
      }
    }

    for (const game of session.games) {
      if (game.rounds.length === 0) continue
      totals.games += 1
      totals.rounds += game.rounds.length
      const result = gameResult(game, session.rules)
      const gameTotalsByTeam = gameTotals(game, session.rules)

      for (const team of teamsForGame(game.partnership)) {
        const members = game.partnership[team]
        const won = result.finished && result.winner === team
        for (const id of members) {
          const stats = statsFor(nameOf(id), session.date)
          stats.gamesPlayed += 1
          if (won) stats.gameWins += 1
        }
        recordPairs(members.map(nameOf), won)
        const points = gameTotalsByTeam[team]
        if (!bestGame || points > bestGame.points) {
          bestGame = { points, names: members.map(nameOf), date: session.date, sessionId: session.id }
        }
      }
    }
  }

  return {
    totals,
    players: [...players.values()].sort(
      (a, b) => b.sessionWins - a.sessionWins || b.gameWins - a.gameWins || b.sessionsPlayed - a.sessionsPlayed,
    ),
    partnerships: [...pairs.values()]
      .filter((p) => p.gamesTogether >= 2)
      .sort((a, b) => b.winsTogether - a.winsTogether || b.gamesTogether - a.gamesTogether),
    bestGame,
  }
}

/** Win rate 0–1, or null when there is nothing to rate. */
export function winRate(wins: number, played: number): number | null {
  return played > 0 ? wins / played : null
}
