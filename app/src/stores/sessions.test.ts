import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionsStore } from './sessions'
import { DEFAULT_RULES } from '../domain/rules'
import { makeEntry } from '../domain/test-helpers'
import type { CanastaType, Session, TeamId, TeamRoundEntry } from '../domain/types'

const RULES = { ...DEFAULT_RULES, gameTarget: 100 }
const PLAYERS = [
  { id: 'p1', name: 'Ana' },
  { id: 'p2', name: 'Beto' },
  { id: 'p3', name: 'Caro' },
  { id: 'p4', name: 'Dani' },
]

/** One planned game: any round where A scores (>= 100) wins it. */
function oneGameSession(): Session {
  return {
    id: 's1',
    date: '2026-10-01',
    createdAt: 1,
    playerCount: 4,
    players: PLAYERS,
    manoId: 'p1',
    initialDealerId: 'p2',
    plannedGames: 1,
    rules: RULES,
    games: [{ partnership: { A: ['p1', 'p3'], B: ['p2', 'p4'], C: [] }, dealerId: 'p2', manoId: 'p1', rounds: [] }],
    status: 'in_progress',
  }
}

function entries(a: Partial<TeamRoundEntry> = {}): Record<TeamId, TeamRoundEntry> {
  return { A: makeEntry(a), B: makeEntry(), C: makeEntry() }
}

const WINNING = entries({ meldedPoints: 200, canastas: { clean: 1 } as Record<CanastaType, number> })
const NOTHING = entries()

let store: ReturnType<typeof useSessionsStore>

beforeEach(() => {
  setActivePinia(createPinia())
  store = useSessionsStore()
  store.setLocalSessions([oneGameSession()])
})

const session = () => store.findSession('s1')!
const rounds = () => session().games[0].rounds

describe('sessions store — rounds', () => {
  it('gives each new round its own id and a copy of the entries', () => {
    const draft = entries({ meldedPoints: 50 })
    store.addRound('s1', 0, draft)
    store.addRound('s1', 0, NOTHING)
    expect(rounds()[0].id).not.toBe(rounds()[1].id)
    draft.A.meldedPoints = 999
    expect(rounds()[0].entries.A.meldedPoints).toBe(50)
  })

  it('updates the round by id even after an earlier one is deleted', () => {
    store.addRound('s1', 0, NOTHING)
    store.addRound('s1', 0, NOTHING)
    const [first, second] = rounds()
    store.deleteRound('s1', 0, first.id)
    expect(store.updateRound('s1', 0, second.id, entries({ meldedPoints: 40 }))).toBe(true)
    expect(rounds()).toHaveLength(1)
    expect(rounds()[0].entries.A.meldedPoints).toBe(40)
  })

  it('refuses to update a round that no longer exists', () => {
    store.addRound('s1', 0, NOTHING)
    const { id } = rounds()[0]
    store.deleteRound('s1', 0, id)
    expect(store.updateRound('s1', 0, id, WINNING)).toBe(false)
    expect(rounds()).toHaveLength(0)
  })

  it('ignores deleting an unknown round', () => {
    store.addRound('s1', 0, NOTHING)
    store.deleteRound('s1', 0, 'nope')
    expect(rounds()).toHaveLength(1)
  })
})

describe('sessions store — status follows the scores', () => {
  it('finishes when every game is won', () => {
    store.addRound('s1', 0, WINNING)
    expect(session().status).toBe('finished')
    expect(session().endedEarly).toBeUndefined()
  })

  it('reopens when the winning round is deleted', () => {
    store.addRound('s1', 0, WINNING)
    store.deleteRound('s1', 0, rounds()[0].id)
    expect(session().status).toBe('in_progress')
  })

  it('reopens when the winning round is edited down', () => {
    store.addRound('s1', 0, WINNING)
    store.updateRound('s1', 0, rounds()[0].id, NOTHING)
    expect(session().status).toBe('in_progress')
  })

  it('can be ended early, survives round edits, and reopened', () => {
    store.finishSession('s1')
    expect(session().status).toBe('finished')
    expect(session().endedEarly).toBe(true)

    store.addRound('s1', 0, NOTHING)
    expect(session().status).toBe('finished')

    store.reopenSession('s1')
    expect(session().status).toBe('in_progress')
    expect(session().endedEarly).toBeUndefined()
  })

  it('does not mark a session won on the scores as ended early', () => {
    store.addRound('s1', 0, WINNING)
    store.finishSession('s1')
    expect(session().endedEarly).toBeUndefined()
    // Reopening a session finished by its scores keeps it finished.
    store.reopenSession('s1')
    expect(session().status).toBe('finished')
  })
})

describe('sessions store — createSession', () => {
  it('does not share arrays with the caller', () => {
    const players = PLAYERS.map((p) => ({ ...p }))
    const partnership = { A: ['p1', 'p3'], B: ['p2', 'p4'], C: [] as string[] }
    const created = store.createSession({
      date: '2026-10-02',
      rules: RULES,
      playerCount: 4,
      players,
      manoId: 'p1',
      initialDealerId: 'p2',
      initialPartnership: partnership,
    })
    players[0].name = 'Changed'
    partnership.A.push('p9')
    expect(created.players[0].name).toBe('Ana')
    expect(created.games[0].partnership.A).not.toContain('p9')
    expect(created.status).toBe('in_progress')
  })
})
