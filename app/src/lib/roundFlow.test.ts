import { describe, expect, it } from 'vitest'
import {
  allVisitKeys,
  buildSteps,
  currentStepIndex,
  firstTodoStep,
  isSectionVisited,
  nextStep,
  visitKey,
} from './roundFlow'
import type { TeamId } from '../domain/types'

const TEAMS: TeamId[] = ['A', 'B']
const COUNTS: Record<TeamId, number> = { A: 2, B: 2, C: 0 }
const steps = buildSteps(TEAMS, COUNTS)

describe('buildSteps', () => {
  it('walks each team in table-talk order with one hand step per player', () => {
    expect(steps.map((s) => `${s.team}:${s.section}:${s.player}`)).toEqual([
      'A:canastas:0',
      'A:honors:0',
      'A:melded:0',
      'A:hand:0',
      'A:hand:1',
      'B:canastas:0',
      'B:honors:0',
      'B:melded:0',
      'B:hand:0',
      'B:hand:1',
    ])
  })
})

describe('hand progress is tracked per player', () => {
  it('leaving after the first player keeps the second player to do', () => {
    const visited = new Set([
      visitKey('A', 'canastas'),
      visitKey('A', 'honors'),
      visitKey('A', 'melded'),
      visitKey('A', 'hand', 0),
    ])
    expect(isSectionVisited(visited, 'A', 'hand', 2)).toBe(false)
    expect(firstTodoStep(steps, visited, 'A')).toEqual({ team: 'A', section: 'hand', player: 1 })
    // Nothing open (e.g. after switching tabs and back): Next resumes at player 2.
    expect(nextStep(steps, visited, { team: 'A', section: null, player: 0 })).toEqual({
      team: 'A',
      section: 'hand',
      player: 1,
    })
  })

  it('counts the hand section done only once every player is visited', () => {
    const visited = new Set([visitKey('A', 'hand', 0), visitKey('A', 'hand', 1)])
    expect(isSectionVisited(visited, 'A', 'hand', 2)).toBe(true)
  })
})

describe('nextStep', () => {
  it('moves from one player to the next inside the hand section', () => {
    expect(nextStep(steps, new Set(), { team: 'A', section: 'hand', player: 0 })).toEqual({
      team: 'A',
      section: 'hand',
      player: 1,
    })
  })

  it('moves to the next team after the last player', () => {
    expect(nextStep(steps, new Set(), { team: 'A', section: 'hand', player: 1 })?.team).toBe('B')
  })

  it('returns null (review) after the last team’s last player', () => {
    expect(nextStep(steps, new Set(), { team: 'B', section: 'hand', player: 1 })).toBeNull()
  })

  it('with extras open, resumes at the team’s first unvisited step', () => {
    const visited = new Set([visitKey('A', 'canastas')])
    expect(nextStep(steps, visited, { team: 'A', section: 'extras', player: 0 })?.section).toBe('honors')
  })

  it('a fully visited team continues to the next team', () => {
    const visited = new Set(allVisitKeys(['A'], COUNTS))
    expect(currentStepIndex(steps, visited, { team: 'A', section: null, player: 0 })).toBe(4)
    expect(nextStep(steps, visited, { team: 'A', section: null, player: 0 })?.team).toBe('B')
  })
})

describe('allVisitKeys', () => {
  it('marks every step and extras so edited rounds start complete', () => {
    const visited = new Set(allVisitKeys(TEAMS, COUNTS))
    for (const team of TEAMS) expect(firstTodoStep(steps, visited, team)).toBeNull()
    expect(visited.has(visitKey('B', 'extras'))).toBe(true)
  })
})
