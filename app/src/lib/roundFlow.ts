// Pure step logic for the guided round entry (RoundEntryPage). Kept free of
// Vue so the "what comes next" rules can be unit tested.

import type { TeamId } from '../domain/types'

export type RoundSectionKey = 'canastas' | 'honors' | 'melded' | 'hand' | 'extras'
export type FlowSectionKey = Exclude<RoundSectionKey, 'extras'>

/** The order the table talks through a round; "extras" is opt-in, never a step. */
export const FLOW_SECTIONS: readonly FlowSectionKey[] = ['canastas', 'honors', 'melded', 'hand']
export const ALL_SECTIONS: readonly RoundSectionKey[] = [...FLOW_SECTIONS, 'extras']

export interface FlowStep {
  team: TeamId
  section: FlowSectionKey
  /** Player index within the team — only meaningful for the hand section. */
  player: number
}

export interface FlowPosition {
  team: TeamId
  section: RoundSectionKey | null
  player: number
}

/** Every step in order: each team's sections, with one hand step per player. */
export function buildSteps(teams: readonly TeamId[], playerCounts: Record<TeamId, number>): FlowStep[] {
  return teams.flatMap((team) =>
    FLOW_SECTIONS.flatMap((section): FlowStep[] =>
      section === 'hand'
        ? Array.from({ length: playerCounts[team] }, (_, player) => ({ team, section, player }))
        : [{ team, section, player: 0 }],
    ),
  )
}

/** Visited marker for one step. Hand is tracked per player, so leaving after
 * the first player doesn't mark the rest as done. */
export function visitKey(team: TeamId, section: RoundSectionKey, player = 0): string {
  return section === 'hand' ? `${team}:hand:${player}` : `${team}:${section}`
}

/** Every marker for the given teams — used to start an edited round as fully visited. */
export function allVisitKeys(teams: readonly TeamId[], playerCounts: Record<TeamId, number>): string[] {
  return [
    ...buildSteps(teams, playerCounts).map((s) => visitKey(s.team, s.section, s.player)),
    ...teams.map((team) => visitKey(team, 'extras')),
  ]
}

export function isSectionVisited(
  visited: ReadonlySet<string>,
  team: TeamId,
  section: RoundSectionKey,
  playerCount: number,
): boolean {
  if (section !== 'hand') return visited.has(visitKey(team, section))
  for (let p = 0; p < playerCount; p++) if (!visited.has(visitKey(team, 'hand', p))) return false
  return true
}

function isStepVisited(visited: ReadonlySet<string>, step: FlowStep): boolean {
  return visited.has(visitKey(step.team, step.section, step.player))
}

/** The team's first step not yet visited, or null when the team is done. */
export function firstTodoStep(steps: readonly FlowStep[], visited: ReadonlySet<string>, team: TeamId): FlowStep | null {
  return steps.find((s) => s.team === team && !isStepVisited(visited, s)) ?? null
}

/**
 * Index of the step the scorer is "on". When nothing (or extras) is open it
 * points just before the team's first unvisited step, so Next resumes there.
 */
export function currentStepIndex(
  steps: readonly FlowStep[],
  visited: ReadonlySet<string>,
  pos: FlowPosition,
): number {
  const { team, section, player } = pos
  if (section && section !== 'extras') {
    return steps.findIndex(
      (s) => s.team === team && s.section === section && (section !== 'hand' || s.player === player),
    )
  }
  const firstTodo = steps.findIndex((s) => s.team === team && !isStepVisited(visited, s))
  if (firstTodo >= 0) return firstTodo - 1
  // Everything visited: continue after the team's last step.
  let last = -1
  steps.forEach((s, i) => {
    if (s.team === team) last = i
  })
  return last
}

/** The step Next leads to, or null when the next stop is the review. */
export function nextStep(steps: readonly FlowStep[], visited: ReadonlySet<string>, pos: FlowPosition): FlowStep | null {
  return steps[currentStepIndex(steps, visited, pos) + 1] ?? null
}
