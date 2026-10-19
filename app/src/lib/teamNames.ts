import type { Game, Player, TeamId } from '../domain/types'

/**
 * Each team's members by name ("Ana / Luis"), shown in place of "Team A"
 * while keeping score. A team with a member that can't be resolved falls
 * back to its generic label rather than leaking a raw player id.
 */
export function teamNames(
  partnership: Game['partnership'] | undefined,
  players: Player[],
  fallback: (team: TeamId) => string,
): Record<TeamId, string> {
  const nameOf = (team: TeamId): string => {
    const names = (partnership?.[team] ?? []).map((id) => players.find((p) => p.id === id)?.name)
    return names.length > 0 && names.every(Boolean) ? names.join(' / ') : fallback(team)
  }
  return { A: nameOf('A'), B: nameOf('B'), C: nameOf('C') }
}
