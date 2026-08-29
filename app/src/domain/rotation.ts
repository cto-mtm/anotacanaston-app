import type { Game, PlayerId, TeamId } from './types'

export type GameSkeleton = Pick<Game, 'partnership' | 'dealerId' | 'manoId'>

/**
 * Builds the 3-game schedule for a 4-player session: game 1 is the chosen
 * partnership, games 2-3 cover the remaining two pairings of 4 players.
 * The dealer and mano are fixed for games 1-2; in game 3 the dealer moves
 * one seat clockwise from the previous dealer, skipping the mano's seat
 * (the mano never deals and never moves).
 */
export function buildFourPlayerSchedule(
  players: PlayerId[],
  manoId: PlayerId,
  dealerId: PlayerId,
  initialPartnership: Record<TeamId, PlayerId[]>,
): GameSkeleton[] {
  const partnerId = initialPartnership.A.find((p) => p !== manoId)
  const [opp1, opp2] = initialPartnership.B
  if (!partnerId || opp1 === undefined || opp2 === undefined) {
    throw new Error('initialPartnership must contain the mano plus 3 other distinct players')
  }

  const game1: GameSkeleton = {
    partnership: { A: [manoId, partnerId], B: [opp1, opp2], C: [] },
    dealerId,
    manoId,
  }
  const game2: GameSkeleton = {
    partnership: { A: [manoId, opp1], B: [partnerId, opp2], C: [] },
    dealerId,
    manoId,
  }

  const dealerIndex = players.indexOf(dealerId)
  if (dealerIndex === -1) throw new Error('dealerId must be one of players')
  let nextIndex = (dealerIndex + 1) % players.length
  if (players[nextIndex] === manoId) nextIndex = (nextIndex + 1) % players.length
  const game3Dealer = players[nextIndex]

  const game3: GameSkeleton = {
    partnership: { A: [manoId, opp2], B: [partnerId, opp1], C: [] },
    dealerId: game3Dealer,
    manoId,
  }

  return [game1, game2, game3]
}

/**
 * 6-player partnerships (2 teams of 3) are assigned manually per game in
 * the wizard — there is no computed rotation. This just validates shape.
 */
export function buildSixPlayerGames2x3(
  games: Array<{ partnership: Record<TeamId, PlayerId[]>; dealerId: PlayerId; manoId: PlayerId }>,
): GameSkeleton[] {
  for (const game of games) {
    const all = [...game.partnership.A, ...game.partnership.B]
    if (game.partnership.A.length !== 3 || game.partnership.B.length !== 3) {
      throw new Error('6-player 2x3 games require exactly 3 players per team')
    }
    if (new Set(all).size !== 6) {
      throw new Error('6-player 2x3 games require 6 distinct players')
    }
  }
  return games.map(({ partnership, dealerId, manoId }) => ({
    partnership: { ...partnership, C: [] },
    dealerId,
    manoId,
  }))
}

/**
 * 6-player partnerships (3 teams of 2) are assigned manually per game in
 * the wizard — there is no computed rotation. This just validates shape.
 */
export function buildSixPlayerGames3x2(
  games: Array<{ partnership: Record<TeamId, PlayerId[]>; dealerId: PlayerId; manoId: PlayerId }>,
): GameSkeleton[] {
  for (const game of games) {
    const all = [...game.partnership.A, ...game.partnership.B, ...game.partnership.C]
    if (game.partnership.A.length !== 2 || game.partnership.B.length !== 2 || game.partnership.C.length !== 2) {
      throw new Error('6-player 3x2 games require exactly 2 players per team')
    }
    if (new Set(all).size !== 6) {
      throw new Error('6-player 3x2 games require 6 distinct players')
    }
  }
  return games.map(({ partnership, dealerId, manoId }) => ({ partnership, dealerId, manoId }))
}

/** Legacy alias for backward compat — delegates to 2x3. */
export function buildSixPlayerGames(
  games: Array<{ partnership: Record<TeamId, PlayerId[]>; dealerId: PlayerId; manoId: PlayerId }>,
): GameSkeleton[] {
  return buildSixPlayerGames2x3(games)
}
