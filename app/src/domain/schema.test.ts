import { describe, expect, it } from 'vitest'
import { sessionSchema } from './schema'
import { DEFAULT_RULES } from './rules'
import { makeEntry, makeRound } from './test-helpers'
import type { Session } from './types'

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: 's1',
    date: '2026-01-01',
    playerCount: 4,
    players: [{ id: 'p1', name: 'Ana' }],
    manoId: 'p1',
    initialDealerId: 'p1',
    plannedGames: 1,
    rules: DEFAULT_RULES,
    games: [
      {
        partnership: { A: ['p1'], B: [], C: [] },
        dealerId: 'p1',
        manoId: 'p1',
        rounds: [makeRound({ A: makeEntry({ badMelds: 1 }), B: makeEntry() })],
      },
    ],
    status: 'in_progress',
    ...overrides,
  }
}

describe('sessionSchema', () => {
  it('round-trips a well-formed session', () => {
    const input = session()
    expect(sessionSchema.parse(JSON.parse(JSON.stringify(input)))).toEqual(input)
  })

  it('rejects a session without a house-rules snapshot', () => {
    const raw = JSON.parse(JSON.stringify(session()))
    delete raw.rules
    expect(sessionSchema.safeParse(raw).success).toBe(false)
  })

  it('drops canasta types it does not know', () => {
    const raw = JSON.parse(JSON.stringify(session()))
    raw.games[0].rounds[0].entries.A.canastas.monkey = 1
    const parsed = sessionSchema.parse(raw)
    expect('monkey' in parsed.games[0].rounds[0].entries.A.canastas).toBe(false)
  })
})
