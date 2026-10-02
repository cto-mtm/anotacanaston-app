import { describe, expect, it } from 'vitest'
import { mergeSessions, type CloudState, type SyncedSession, type Tombstones } from './cloud'
import { DEFAULT_RULES } from '../domain/rules'
import type { Session } from '../domain/types'

// mergeSessions is pure and Firestore-free — the reconciliation logic that
// decides cloud-sync outcomes, so it's worth guarding directly.

/** Minimal Session stub — merge only cares about `id`. */
function session(id: string): Session {
  return {
    id,
    date: '2026-01-01',
    playerCount: 4,
    players: [],
    manoId: 'p1',
    initialDealerId: 'p1',
    plannedGames: 1,
    rules: DEFAULT_RULES,
    games: [],
    status: 'in_progress',
  }
}

function cloudSession(id: string, updatedAt: number): SyncedSession {
  return { ...session(id), updatedAt }
}

function cloud(sessions: SyncedSession[], tombstones: Tombstones = {}): CloudState {
  return { sessions, tombstones }
}

describe('mergeSessions', () => {
  it('adopts a cloud-only session and does not schedule it for push', () => {
    const { merged, toPush } = mergeSessions([], cloud([cloudSession('a', 100)]), {})
    expect(merged.map((s) => s.id)).toEqual(['a'])
    expect(toPush).toHaveLength(0)
  })

  it('pushes a local-only session up', () => {
    const { merged, toPush } = mergeSessions([session('a')], cloud([]), { a: 50 })
    expect(merged.map((s) => s.id)).toEqual(['a'])
    expect(toPush.map((s) => s.id)).toEqual(['a'])
  })

  it('local wins when its stamp is newer than cloud', () => {
    const { merged, toPush } = mergeSessions([session('a')], cloud([cloudSession('a', 100)]), { a: 200 })
    expect(merged).toHaveLength(1)
    // local won → must be pushed up to overwrite the older cloud copy
    expect(toPush.map((s) => s.id)).toEqual(['a'])
  })

  it('cloud wins when it is newer than the local stamp', () => {
    const { merged, toPush } = mergeSessions([session('a')], cloud([cloudSession('a', 300)]), { a: 100 })
    expect(merged).toHaveLength(1)
    // cloud won and cloud already has it → nothing to push
    expect(toPush).toHaveLength(0)
  })

  it('unstamped local session is treated as oldest (cloud wins)', () => {
    const { toPush } = mergeSessions([session('a')], cloud([cloudSession('a', 1)]), {})
    expect(toPush).toHaveLength(0)
  })

  it('unions disjoint local and cloud sets', () => {
    const { merged, toPush } = mergeSessions([session('local')], cloud([cloudSession('cloud', 100)]), { local: 100 })
    expect(merged.map((s) => s.id).sort()).toEqual(['cloud', 'local'])
    expect(toPush.map((s) => s.id)).toEqual(['local'])
  })

  it('strips the updatedAt bookkeeping field from adopted cloud sessions', () => {
    const { merged } = mergeSessions([], cloud([cloudSession('a', 100)]), {})
    expect('updatedAt' in merged[0]).toBe(false)
  })
})

describe('mergeSessions — deletes', () => {
  it('a local delete newer than the cloud copy removes it and is pushed as a tombstone', () => {
    const { merged, toDelete, tombstones } = mergeSessions([], cloud([cloudSession('a', 100)]), {}, { a: 200 })
    expect(merged).toHaveLength(0)
    expect(toDelete).toEqual({ a: 200 })
    expect(tombstones).toEqual({ a: 200 })
  })

  it('a cloud tombstone removes an older local copy (no resurrection from another device)', () => {
    const { merged, toPush, toDelete, tombstones } = mergeSessions(
      [session('a')],
      cloud([], { a: 200 }),
      { a: 100 },
    )
    expect(merged).toHaveLength(0)
    expect(toPush).toHaveLength(0)
    expect(toDelete).toEqual({})
    expect(tombstones).toEqual({ a: 200 })
  })

  it('an edit newer than the delete wins and is pushed back up', () => {
    const { merged, toPush, tombstones } = mergeSessions([session('a')], cloud([], { a: 100 }), { a: 200 })
    expect(merged.map((s) => s.id)).toEqual(['a'])
    expect(toPush.map((s) => s.id)).toEqual(['a'])
    expect(tombstones).toEqual({})
  })

  it('a tombstone wins a tie with a session', () => {
    const { merged } = mergeSessions([], cloud([cloudSession('a', 100)]), {}, { a: 100 })
    expect(merged).toHaveLength(0)
  })

  it('does not re-push a tombstone the cloud already has', () => {
    const { toDelete, tombstones } = mergeSessions([], cloud([], { a: 100 }), {}, { a: 100 })
    expect(toDelete).toEqual({})
    expect(tombstones).toEqual({ a: 100 })
  })
})
