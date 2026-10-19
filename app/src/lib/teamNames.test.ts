import { describe, expect, it } from 'vitest'
import { teamNames } from './teamNames'
import type { Player } from '../domain/types'

const PLAYERS: Player[] = [
  { id: 'p1', name: 'Ana' },
  { id: 'p2', name: 'Luis' },
  { id: 'p3', name: 'Sofía' },
  { id: 'p4', name: 'Pedro' },
]
const fallback = (team: string) => `Team ${team}`

describe('teamNames', () => {
  it("joins each team's member names", () => {
    const names = teamNames({ A: ['p1', 'p2'], B: ['p3', 'p4'], C: [] }, PLAYERS, fallback)
    expect(names.A).toBe('Ana / Luis')
    expect(names.B).toBe('Sofía / Pedro')
  })

  it('falls back to the generic label for an empty team', () => {
    expect(teamNames({ A: ['p1', 'p2'], B: ['p3', 'p4'], C: [] }, PLAYERS, fallback).C).toBe('Team C')
  })

  it('falls back instead of showing a raw id when a member is unknown', () => {
    expect(teamNames({ A: ['p1', 'ghost'], B: ['p3', 'p4'], C: [] }, PLAYERS, fallback).A).toBe('Team A')
  })

  it('falls back for every team while the game is still loading', () => {
    expect(teamNames(undefined, [], fallback)).toEqual({ A: 'Team A', B: 'Team B', C: 'Team C' })
  })
})
