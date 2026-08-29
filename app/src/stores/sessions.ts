import { defineStore } from 'pinia'
import { ref } from 'vue'
import { z } from 'zod'
import { sessionSchema } from '../domain/schema'
import { gameResult, gameTotals, meldThreshold, sessionTallies, sessionWinner } from '../domain/scoring'
import { buildFourPlayerSchedule, buildSixPlayerGames2x3, buildSixPlayerGames3x2, type GameSkeleton } from '../domain/rotation'
import { teamsForGame } from '../domain/constants'
import type { Game, Player, PlayerId, Session, SixPlayerFormat, TeamId, TeamRoundEntry } from '../domain/types'

export interface CreateFourPlayerSessionInput {
  date: string
  playerCount: 4
  players: Player[]
  manoId: PlayerId
  initialDealerId: PlayerId
  initialPartnership: Record<TeamId, PlayerId[]>
}

export interface CreateSixPlayerSessionInput {
  date: string
  playerCount: 6
  sixPlayerFormat: SixPlayerFormat
  players: Player[]
  manoId: PlayerId
  games: Array<{ partnership: Record<TeamId, PlayerId[]>; dealerId: PlayerId; manoId: PlayerId }>
}

export type CreateSessionInput = CreateFourPlayerSessionInput | CreateSixPlayerSessionInput

export const useSessionsStore = defineStore(
  'sessions',
  () => {
    const sessions = ref<Session[]>([])

    function findSession(sessionId: string): Session | undefined {
      return sessions.value.find((s) => s.id === sessionId)
    }

    function createSession(input: CreateSessionInput): Session {
      let gameSkeletons: GameSkeleton[]
      let initialDealerId: PlayerId

      if (input.playerCount === 4) {
        gameSkeletons = buildFourPlayerSchedule(
          input.players.map((p) => p.id),
          input.manoId,
          input.initialDealerId,
          input.initialPartnership,
        )
        initialDealerId = input.initialDealerId
      } else {
        if (input.sixPlayerFormat === '3x2') {
          gameSkeletons = buildSixPlayerGames3x2(input.games)
        } else {
          gameSkeletons = buildSixPlayerGames2x3(input.games)
        }
        const firstDealer = gameSkeletons[0]?.dealerId
        if (!firstDealer) throw new Error('a 6-player session needs at least one game')
        initialDealerId = firstDealer
      }

      const games: Game[] = gameSkeletons.map((skeleton) => ({ ...skeleton, rounds: [] }))

      const session: Session = {
        id: crypto.randomUUID(),
        date: input.date,
        playerCount: input.playerCount,
        sixPlayerFormat: input.playerCount === 6 ? input.sixPlayerFormat : undefined,
        players: input.players,
        manoId: input.manoId,
        initialDealerId,
        plannedGames: games.length,
        games,
        status: 'in_progress',
      }

      sessions.value.push(session)
      return session
    }

    function addRound(sessionId: string, gameIndex: number, entries: Record<TeamId, TeamRoundEntry>) {
      const game = findSession(sessionId)?.games[gameIndex]
      if (!game) throw new Error('game not found')
      game.rounds.push({ entries })
    }

    function updateRound(
      sessionId: string,
      gameIndex: number,
      roundIndex: number,
      entries: Record<TeamId, TeamRoundEntry>,
    ) {
      const game = findSession(sessionId)?.games[gameIndex]
      const round = game?.rounds[roundIndex]
      if (!game || !round) throw new Error('round not found')
      round.entries = entries
    }

    function deleteRound(sessionId: string, gameIndex: number, roundIndex: number) {
      const game = findSession(sessionId)?.games[gameIndex]
      if (!game) throw new Error('game not found')
      game.rounds.splice(roundIndex, 1)
    }

    /** Auto-finishes the session once every planned game has a result. */
    function advanceGame(sessionId: string) {
      const session = findSession(sessionId)
      if (!session) return
      const allFinished =
        session.games.length >= session.plannedGames &&
        session.games.every((game) => gameResult(game).finished)
      if (allFinished) finishSession(sessionId)
    }

    function finishSession(sessionId: string) {
      const session = findSession(sessionId)
      if (session) session.status = 'finished'
    }

    function deleteSession(sessionId: string) {
      const index = sessions.value.findIndex((s) => s.id === sessionId)
      if (index !== -1) sessions.value.splice(index, 1)
    }

    function getGameTotals(sessionId: string, gameIndex: number): Record<TeamId, number> {
      const game = findSession(sessionId)?.games[gameIndex]
      return game ? gameTotals(game) : { A: 0, B: 0, C: 0 }
    }

    function getGameResult(sessionId: string, gameIndex: number) {
      const game = findSession(sessionId)?.games[gameIndex]
      return game ? gameResult(game) : { finished: false }
    }

    function getMeldThresholds(sessionId: string, gameIndex: number) {
      const totals = getGameTotals(sessionId, gameIndex)
      const game = findSession(sessionId)?.games[gameIndex]
      const teams = game ? teamsForGame(game.partnership) : (['A', 'B'] as TeamId[])
      const result: Partial<Record<TeamId, ReturnType<typeof meldThreshold>>> = {}
      for (const team of teams) result[team] = meldThreshold(totals[team])
      return result as Record<TeamId, ReturnType<typeof meldThreshold>>
    }

    function getGameTeams(sessionId: string, gameIndex: number): TeamId[] {
      const game = findSession(sessionId)?.games[gameIndex]
      return game ? teamsForGame(game.partnership) : ['A', 'B']
    }

    function getSessionTallies(sessionId: string): Record<PlayerId, number> {
      const session = findSession(sessionId)
      return session ? sessionTallies(session) : {}
    }

    function getSessionWinner(sessionId: string): PlayerId[] {
      const session = findSession(sessionId)
      return session ? sessionWinner(session) : []
    }

    return {
      sessions,
      findSession,
      createSession,
      addRound,
      updateRound,
      deleteRound,
      advanceGame,
      finishSession,
      deleteSession,
      getGameTotals,
      getGameResult,
      getMeldThresholds,
      getGameTeams,
      getSessionTallies,
      getSessionWinner,
    }
  },
  {
    persist: {
      version: 1,
      schema: z.object({ sessions: z.array(sessionSchema) }),
    },
  },
)
