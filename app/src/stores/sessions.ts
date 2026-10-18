import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { z } from 'zod'
import { sessionSchema } from '../domain/schema'
import { gameResult, gameTotals, meldThreshold, sessionStatus, sessionTallies, sessionWinner } from '../domain/scoring'
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

      // Plain copies, so the store never shares arrays with the wizard's local state.
      const games: Game[] = gameSkeletons.map((skeleton) => ({ ...toPlain(skeleton), rounds: [] }))

      const session: Session = {
        id: crypto.randomUUID(),
        date: input.date,
        createdAt: Date.now(),
        playerCount: input.playerCount,
        sixPlayerFormat: input.playerCount === 6 ? input.sixPlayerFormat : undefined,
        players: toPlain(input.players),
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

    /** Re-derives `status` after any change that can move a game's result. */
    function syncStatus(session: Session) {
      session.status = sessionStatus(session)
    }

    function addRound(sessionId: string, gameIndex: number, entries: Record<TeamId, TeamRoundEntry>) {
      const session = findSession(sessionId)
      const game = session?.games[gameIndex]
      if (!session || !game) throw new Error('game not found')
      game.rounds.push({ id: crypto.randomUUID(), entries: toPlain(entries) })
      syncStatus(session)
      commit(session)
    }

    /**
     * Replaces a round's entries, found by id (not position: another device
     * may have deleted an earlier round meanwhile). Returns false if the round
     * no longer exists, so the caller can tell the user instead of
     * overwriting some other round.
     */
    function updateRound(
      sessionId: string,
      gameIndex: number,
      roundId: string,
      entries: Record<TeamId, TeamRoundEntry>,
    ): boolean {
      const session = findSession(sessionId)
      const round = session?.games[gameIndex]?.rounds.find((r) => r.id === roundId)
      if (!session || !round) return false
      round.entries = toPlain(entries)
      syncStatus(session)
      commit(session)
      return true
    }

    function deleteRound(sessionId: string, gameIndex: number, roundId: string) {
      const session = findSession(sessionId)
      const game = session?.games[gameIndex]
      if (!session || !game) return
      const index = game.rounds.findIndex((r) => r.id === roundId)
      if (index === -1) return
      game.rounds.splice(index, 1)
      syncStatus(session)
      commit(session)
    }

    /** Ends the session now, even if some games have no winner yet. */
    function finishSession(sessionId: string) {
      const session = findSession(sessionId)
      if (!session) return
      if (sessionStatus(session) !== 'finished') session.endedEarly = true
      syncStatus(session)
      commit(session)
    }

    /** Undoes finishSession: back to in progress unless every game is already won. */
    function reopenSession(sessionId: string) {
      const session = findSession(sessionId)
      if (!session) return
      delete session.endedEarly
      syncStatus(session)
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
      finishSession,
      reopenSession,
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
      // One broken session must not hide the rest: keep every one that still validates.
      salvage: (data) => {
        const list = (data as { localSessions?: unknown } | null)?.localSessions
        if (!Array.isArray(list)) return undefined
        const localSessions = list.flatMap((raw) => {
          const parsed = sessionSchema.safeParse(raw)
          return parsed.success ? [parsed.data] : []
        })
        return { localSessions }
      },
    },
  },
)
