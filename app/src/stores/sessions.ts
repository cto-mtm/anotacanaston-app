import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { z } from 'zod'
import { sessionSchema } from '../domain/schema'
import { gameResult, gameTotals, meldThreshold, sessionTallies, sessionWinner } from '../domain/scoring'
import { buildFourPlayerSchedule, buildSixPlayerGames2x3, buildSixPlayerGames3x2, type GameSkeleton } from '../domain/rotation'
import { teamsForGame } from '../domain/constants'
import { cloneRules, DEFAULT_RULES } from '../domain/rules'
import { toPlain } from '../lib/cloud'
import type { Game, HouseRules, Player, PlayerId, Session, SixPlayerFormat, TeamId, TeamRoundEntry } from '../domain/types'

export interface CreateFourPlayerSessionInput {
  date: string
  rules: HouseRules
  playerCount: 4
  players: Player[]
  manoId: PlayerId
  initialDealerId: PlayerId
  initialPartnership: Record<TeamId, PlayerId[]>
}

export interface CreateSixPlayerSessionInput {
  date: string
  rules: HouseRules
  playerCount: 6
  sixPlayerFormat: SixPlayerFormat
  players: Player[]
  manoId: PlayerId
  games: Array<{ partnership: Record<TeamId, PlayerId[]>; dealerId: PlayerId; manoId: PlayerId }>
}

export type CreateSessionInput = CreateFourPlayerSessionInput | CreateSixPlayerSessionInput

/**
 * Where a Club member's writes go. Injected by lib/sync.ts so this store never
 * imports Firebase. Fire-and-forget: Firestore's offline cache applies writes
 * locally at once and the live listener feeds them back via setCloudSessions.
 */
export interface CloudWriter {
  save(session: Session): void
  remove(sessionId: string): void
}

/**
 * The games. Two slots, one active (docs/plans/membership-and-storage.md §2):
 *  - localSessions: free / offline / lapsed — persisted to localStorage
 *  - cloudSessions: Club members — in memory, fed by Firestore's listener
 * `sessions` is whichever is active; every action writes through `commit`.
 */
export const useSessionsStore = defineStore(
  'sessions',
  () => {
    const localSessions = ref<Session[]>([])
    const cloudSessions = ref<Session[]>([])
    const cloudWriter = shallowRef<CloudWriter | null>(null)

    const usingCloud = computed(() => cloudWriter.value !== null)
    const sessions = computed(() => (usingCloud.value ? cloudSessions.value : localSessions.value))
    /**
     * For lists: newest game night first. Needed because the cloud slot comes
     * from Firestore in document-id (random UUID) order, not creation order.
     */
    const sessionsNewestFirst = computed(() =>
      [...sessions.value].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    )

    function findSession(sessionId: string): Session | undefined {
      return sessions.value.find((s) => s.id === sessionId)
    }

    /**
     * Persists a session after an in-place change. Local: the persistence
     * plugin saves the mutated state. Cloud: hand a plain copy to Firestore.
     */
    function commit(session: Session) {
      cloudWriter.value?.save(toPlain(session))
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
        createdAt: Date.now(),
        playerCount: input.playerCount,
        sixPlayerFormat: input.playerCount === 6 ? input.sixPlayerFormat : undefined,
        players: input.players,
        manoId: input.manoId,
        initialDealerId,
        plannedGames: games.length,
        rules: cloneRules(input.rules),
        games,
        status: 'in_progress',
      }

      sessions.value.push(session)
      commit(session)
      return session
    }

    function addRound(sessionId: string, gameIndex: number, entries: Record<TeamId, TeamRoundEntry>) {
      const session = findSession(sessionId)
      const game = session?.games[gameIndex]
      if (!session || !game) throw new Error('game not found')
      game.rounds.push({ entries })
      commit(session)
    }

    function updateRound(
      sessionId: string,
      gameIndex: number,
      roundIndex: number,
      entries: Record<TeamId, TeamRoundEntry>,
    ) {
      const session = findSession(sessionId)
      const round = session?.games[gameIndex]?.rounds[roundIndex]
      if (!session || !round) throw new Error('round not found')
      round.entries = entries
      commit(session)
    }

    function deleteRound(sessionId: string, gameIndex: number, roundIndex: number) {
      const session = findSession(sessionId)
      const game = session?.games[gameIndex]
      if (!session || !game) throw new Error('game not found')
      game.rounds.splice(roundIndex, 1)
      commit(session)
    }

    /** Auto-finishes the session once every planned game has a result. */
    function advanceGame(sessionId: string) {
      const session = findSession(sessionId)
      if (!session) return
      const allFinished =
        session.games.length >= session.plannedGames &&
        session.games.every((game) => gameResult(game, session.rules).finished)
      if (allFinished) finishSession(sessionId)
    }

    function finishSession(sessionId: string) {
      const session = findSession(sessionId)
      if (!session) return
      session.status = 'finished'
      commit(session)
    }

    function deleteSession(sessionId: string) {
      const index = sessions.value.findIndex((s) => s.id === sessionId)
      if (index !== -1) sessions.value.splice(index, 1)
      cloudWriter.value?.remove(sessionId)
    }

    // ── Backend switching (called only by lib/sync.ts) ────────────────

    /** Club member: reads come from the cloud slot, writes go to `writer`. */
    function useCloud(writer: CloudWriter) {
      cloudSessions.value = []
      cloudWriter.value = writer
    }

    /** Back to the device's own games (sign-out, lapse). */
    function useLocal() {
      cloudWriter.value = null
      cloudSessions.value = []
    }

    /** The Firestore listener's latest view of the member's games. */
    function setCloudSessions(next: Session[]) {
      cloudSessions.value = next
    }

    /** Replaces the device's own games (after a copy-down, or emptied after an upload). */
    function setLocalSessions(next: Session[]) {
      localSessions.value = next
    }

    // ── Engine-backed reads ───────────────────────────────────────────

    function getSessionRules(sessionId: string): HouseRules {
      const session = findSession(sessionId)
      return session ? session.rules : DEFAULT_RULES
    }

    function getGameTotals(sessionId: string, gameIndex: number): Record<TeamId, number> {
      const game = findSession(sessionId)?.games[gameIndex]
      return game ? gameTotals(game, getSessionRules(sessionId)) : { A: 0, B: 0, C: 0 }
    }

    function getGameResult(sessionId: string, gameIndex: number) {
      const game = findSession(sessionId)?.games[gameIndex]
      return game ? gameResult(game, getSessionRules(sessionId)) : { finished: false }
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
      localSessions,
      cloudSessions,
      cloudWriter,
      usingCloud,
      sessions,
      sessionsNewestFirst,
      findSession,
      createSession,
      addRound,
      updateRound,
      deleteRound,
      advanceGame,
      finishSession,
      deleteSession,
      useCloud,
      useLocal,
      setCloudSessions,
      setLocalSessions,
      getSessionRules,
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
      version: 2,
      // Only the device's own games — a member's cloud games stay in Firestore's cache.
      pick: ['localSessions'],
      schema: z.object({
        localSessions: z.array(sessionSchema),
      }),
      // v1 kept the games under `sessions` (plus sync stamps, now dropped).
      // sessionSchema defaults the `createdAt` those sessions lack.
      migrate: (raw) => {
        const v1 = (raw ?? {}) as { sessions?: unknown; localSessions?: unknown }
        return { localSessions: v1.localSessions ?? v1.sessions ?? [] }
      },
    },
  },
)
