import { describe, expect, it } from 'vitest'
import { computeDashboardStats, playerKey, winRate } from './stats'
import { DEFAULT_RULES } from './rules'
import { makeEntry, makeRound } from './test-helpers'
import type { CanastaType, Game, Session } from './types'

const PLAYERS = [
  { id: 'p1', name: 'Ana' },
  { id: 'p2', name: 'Caro' },
  { id: 'p3', name: 'Beto' },
  { id: 'p4', name: 'Dani' },
]

/** A game Team A (p1+p2 by default) wins 15,500 to 500. */
function wonByA(partnership: Game['partnership'] = { A: ['p1', 'p2'], B: ['p3', 'p4'], C: [] }): Game {
  const round = makeRound({
    A: makeEntry({ meldedPoints: 15_000, canastas: { clean: 1 } as Record<CanastaType, number> }),
    B: makeEntry({ canastas: { clean: 1 } as Record<CanastaType, number> }),
  })
  return { partnership, dealerId: 'p2', manoId: 'p1', rounds: [round] }
}

function session(id: string, date: string, games: Game[], status: Session['status'] = 'finished', players = PLAYERS): Session {
  return {
    id,
    date,
    createdAt: 0,
    playerCount: 4,
    players,
    manoId: 'p1',
    initialDealerId: 'p2',
    plannedGames: games.length,
    rules: DEFAULT_RULES,
    games,
    status,
  }
}

describe('playerKey', () => {
  it('ignores case, accents and extra spaces', () => {
    expect(playerKey('  María   José ')).toBe(playerKey('maria jose'))
  })
})

describe('computeDashboardStats', () => {
  it('counts totals, skipping games with no rounds', () => {
    const empty: Game = { ...wonByA(), rounds: [] }
    const stats = computeDashboardStats([session('s1', '2026-01-01', [wonByA(), empty]), session('s2', '2026-01-02', [], 'in_progress')])
    expect(stats.totals).toEqual({ sessions: 2, finishedSessions: 1, games: 1, rounds: 1 })
  })

  it('credits session and game wins to the winning players', () => {
    const stats = computeDashboardStats([session('s1', '2026-01-01', [wonByA()])])
    const ana = stats.players.find((p) => p.name === 'Ana')
    const beto = stats.players.find((p) => p.name === 'Beto')
    expect(ana).toMatchObject({ sessionsPlayed: 1, sessionWins: 1, gamesPlayed: 1, gameWins: 1 })
    expect(beto).toMatchObject({ sessionsPlayed: 1, sessionWins: 0, gamesPlayed: 1, gameWins: 0 })
    expect(stats.players[0].sessionWins).toBe(1)
  })

  it('matches the same player across sessions by name', () => {
    const renamed = PLAYERS.map((p) => (p.id === 'p1' ? { ...p, name: 'ana ' } : p))
    const stats = computeDashboardStats([
      session('s1', '2026-01-01', [wonByA()]),
      session('s2', '2026-01-02', [wonByA()], 'finished', renamed),
    ])
    const ana = stats.players.filter((p) => playerKey(p.name) === 'ana')
    expect(ana).toHaveLength(1)
    expect(ana[0].sessionsPlayed).toBe(2)
  })

  it('tracks current and best win streaks in date order', () => {
    const lostByAna = wonByA({ A: ['p3', 'p4'], B: ['p1', 'p2'], C: [] })
    const stats = computeDashboardStats([
      session('s3', '2026-01-03', [wonByA()]),
      session('s1', '2026-01-01', [wonByA()]),
      session('s2', '2026-01-02', [lostByAna]),
      session('s4', '2026-01-04', [wonByA()]),
    ])
    const ana = stats.players.find((p) => p.name === 'Ana')
    expect(ana).toMatchObject({ currentStreak: 2, bestStreak: 2, sessionWins: 3 })
  })

  it('reports partnerships that played together at least twice', () => {
    const stats = computeDashboardStats([
      session('s1', '2026-01-01', [wonByA(), wonByA()]),
      session('s2', '2026-01-02', [wonByA({ A: ['p1', 'p3'], B: ['p2', 'p4'], C: [] })]),
    ])
    expect(stats.partnerships[0]).toMatchObject({ names: ['Ana', 'Caro'], gamesTogether: 2, winsTogether: 2 })
    expect(stats.partnerships.some((p) => p.names.includes('Beto') && p.names.includes('Ana'))).toBe(false)
  })

  it('finds the best game total', () => {
    const stats = computeDashboardStats([session('s1', '2026-01-01', [wonByA()])])
    expect(stats.bestGame).toMatchObject({ points: 15_500, names: ['Ana', 'Caro'], sessionId: 's1' })
  })
})

describe('winRate', () => {
  it('is null with nothing played', () => {
    expect(winRate(0, 0)).toBeNull()
    expect(winRate(1, 4)).toBe(0.25)
  })
})
