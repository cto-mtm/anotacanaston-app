import { describe, expect, it } from 'vitest'
import { buildFourPlayerSchedule, buildSixPlayerGames2x3, buildSixPlayerGames3x2 } from './rotation'

function pairKey(partnership: Record<'A' | 'B' | 'C', string[]>): string {
  return [...partnership.A].sort().join(',') + '|' + [...partnership.B].sort().join(',')
}

describe('buildFourPlayerSchedule', () => {
  const players = ['p1', 'p2', 'p3', 'p4'] // clockwise seat order
  const manoId = 'p1'
  const dealerId = 'p2' // to mano's left
  const initialPartnership = { A: ['p1', 'p2'], B: ['p3', 'p4'], C: [] as string[] }

  const games = buildFourPlayerSchedule(players, manoId, dealerId, initialPartnership)

  it('produces exactly 3 games', () => {
    expect(games).toHaveLength(3)
  })

  it('produces 3 distinct partnership pairings covering all combinations', () => {
    const keys = games.map((g) => pairKey(g.partnership))
    expect(new Set(keys).size).toBe(3)
  })

  it('keeps the mano the same across all games and never dealing', () => {
    for (const game of games) {
      expect(game.manoId).toBe(manoId)
      expect(game.dealerId).not.toBe(manoId)
    }
  })

  it('keeps the dealer fixed for games 1 and 2', () => {
    expect(games[0].dealerId).toBe(dealerId)
    expect(games[1].dealerId).toBe(dealerId)
  })

  it('moves the dealer one seat clockwise (skipping mano) only in game 3', () => {
    // dealer p2 -> next seat clockwise is p3 (index 2), not mano, so game 3 dealer = p3
    expect(games[2].dealerId).toBe('p3')
  })

  it('skips the mano seat when the plain next-seat would land on the mano', () => {
    // dealer p4 (index 3) -> next seat clockwise is p1 (mano) -> should skip to p2
    const skippingGames = buildFourPlayerSchedule(players, 'p1', 'p4', initialPartnership)
    expect(skippingGames[2].dealerId).toBe('p2')
  })

  it('every player partners with every other player exactly once across all 6 team-slots', () => {
    const pairs = new Set<string>()
    for (const game of games) {
      for (const team of ['A', 'B'] as const) {
        const [a, b] = game.partnership[team]
        pairs.add([a, b].sort().join(','))
      }
    }
    expect(pairs.size).toBe(6)
  })
})

describe('buildSixPlayerGames2x3', () => {
  it('accepts well-formed manual partnerships', () => {
    const games = buildSixPlayerGames2x3([
      {
        partnership: { A: ['p1', 'p2', 'p3'], B: ['p4', 'p5', 'p6'], C: [] },
        dealerId: 'p2',
        manoId: 'p1',
      },
    ])
    expect(games).toHaveLength(1)
  })

  it('rejects teams that are not exactly 3 players', () => {
    expect(() =>
      buildSixPlayerGames2x3([
        {
          partnership: { A: ['p1', 'p2'], B: ['p3', 'p4', 'p5', 'p6'], C: [] },
          dealerId: 'p2',
          manoId: 'p1',
        },
      ]),
    ).toThrow()
  })

  it('rejects duplicate players across teams', () => {
    expect(() =>
      buildSixPlayerGames2x3([
        {
          partnership: { A: ['p1', 'p2', 'p3'], B: ['p3', 'p4', 'p5'], C: [] },
          dealerId: 'p2',
          manoId: 'p1',
        },
      ]),
    ).toThrow()
  })
})

describe('buildSixPlayerGames3x2', () => {
  it('accepts well-formed 3x2 partnerships', () => {
    const games = buildSixPlayerGames3x2([
      {
        partnership: { A: ['p1', 'p2'], B: ['p3', 'p4'], C: ['p5', 'p6'] },
        dealerId: 'p2',
        manoId: 'p1',
      },
    ])
    expect(games).toHaveLength(1)
  })

  it('rejects teams that are not exactly 2 players', () => {
    expect(() =>
      buildSixPlayerGames3x2([
        {
          partnership: { A: ['p1', 'p2', 'p3'], B: ['p4', 'p5'], C: ['p6'] },
          dealerId: 'p2',
          manoId: 'p1',
        },
      ]),
    ).toThrow()
  })

  it('rejects duplicate players across teams', () => {
    expect(() =>
      buildSixPlayerGames3x2([
        {
          partnership: { A: ['p1', 'p2'], B: ['p2', 'p3'], C: ['p4', 'p5'] },
          dealerId: 'p2',
          manoId: 'p1',
        },
      ]),
    ).toThrow()
  })
})
