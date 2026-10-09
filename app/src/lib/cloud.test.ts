import { describe, expect, it } from 'vitest'
import { mergeById, parseSessionDoc, toPlain } from './cloud'
import { DEFAULT_RULES } from '../domain/rules'
import type { Session } from '../domain/types'

// The pure half of cloud storage: validating Firestore docs and the
// idempotent one-time copies between the device and the cloud.

function session(id: string, date = '2026-01-01'): Session {
  return {
    id,
    date,
    createdAt: 0,
    playerCount: 4,
    players: [{ id: 'p1', name: 'Ana' }],
    manoId: 'p1',
    initialDealerId: 'p1',
    plannedGames: 1,
    rules: DEFAULT_RULES,
    games: [],
    status: 'in_progress',
  }
}

describe('parseSessionDoc', () => {
  it('accepts a session doc and strips the server updatedAt', () => {
    const parsed = parseSessionDoc({ ...session('a'), updatedAt: { seconds: 1 } })
    expect(parsed).toEqual(session('a'))
  })

  it('rejects malformed docs', () => {
    expect(parseSessionDoc({ id: 'a' })).toBeNull()
    expect(parseSessionDoc(null)).toBeNull()
  })
})

describe('mergeById', () => {
  it('replaces same-id sessions in place and appends new ones', () => {
    const merged = mergeById([session('a'), session('b')], [session('b', '2026-02-02'), session('c')])
    expect(merged.map((s) => s.id)).toEqual(['a', 'b', 'c'])
    expect(merged[1].date).toBe('2026-02-02')
  })

  it('is idempotent — copying the same games twice changes nothing', () => {
    const once = mergeById([session('a')], [session('b')])
    expect(mergeById(once, [session('b')])).toEqual(once)
  })
})

describe('toPlain', () => {
  it('returns a deep copy', () => {
    const original = session('a')
    const copy = toPlain(original)
    expect(copy).toEqual(original)
    expect(copy.players).not.toBe(original.players)
  })
})
