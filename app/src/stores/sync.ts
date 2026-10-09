import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { z } from 'zod'

/**
 * What the UI shows about cloud storage, maintained by lib/sync.ts:
 *  - local:   games live only on this device (not a member)
 *  - saved:   member, every change confirmed by the server
 *  - saving:  member, changes waiting for the server
 *  - offline: member, offline — changes are queued and saved on reconnect
 *  - error:   member, the server rejected a write (e.g. subscription just ended)
 */
export type SaveState = 'local' | 'saved' | 'saving' | 'offline' | 'error'

export const useSyncStore = defineStore(
  'sync',
  () => {
    const saveState = ref<SaveState>('local')
    /** Ids of the device games waiting for the "¿Subirlas a tu cuenta?" answer (empty = no prompt). */
    const pendingImportIds = ref<string[]>([])
    const pendingImport = computed(() => pendingImportIds.value.length)
    /** The server rejected the last upload; the games are offered again. */
    const importFailed = ref(false)
    /** Accounts that said "no" to the upload prompt — don't ask again. */
    const importDeclinedFor = ref<Record<string, true>>({})
    /**
     * Device games that are copies of an account's cloud games (kept at
     * sign-out, copied after a lapse, or just uploaded): session id → uid.
     * Never offered for upload to that account — they'd overwrite newer edits.
     */
    const copiedFrom = ref<Record<string, string>>({})
    /**
     * Accounts that lapsed on a device where they were a member, whose cloud
     * games still have to be copied here. Only such devices get a copy — never
     * one the account merely signs in on.
     */
    const lapseCopyPendingFor = ref<Record<string, true>>({})
    /**
     * The account last confirmed as a member on this device. While membership
     * is still `checking` at launch, that account goes straight to the cloud
     * (served from Firestore's offline cache) instead of briefly showing — and
     * writing to — the device's local games.
     */
    const lastMemberUid = ref<string | null>(null)
    /** False until Firebase has restored (or ruled out) the signed-in user at launch. */
    const ready = ref(false)

    function setSaveState(next: SaveState) {
      saveState.value = next
    }

    function setPendingImport(sessionIds: string[]) {
      pendingImportIds.value = sessionIds
    }

    function setImportFailed(next: boolean) {
      importFailed.value = next
    }

    function declineImport(uid: string) {
      importDeclinedFor.value[uid] = true
      pendingImportIds.value = []
    }

    /** Something new to offer `uid` (e.g. an edited copy): ask again despite an earlier "no". */
    function undeclineImport(uid: string) {
      delete importDeclinedFor.value[uid]
    }

    function markCopiedFrom(uid: string, sessionIds: string[]) {
      for (const id of sessionIds) copiedFrom.value[id] = uid
    }

    function forgetCopies(sessionIds: string[]) {
      for (const id of sessionIds) delete copiedFrom.value[id]
    }

    function setLapseCopyPending(uid: string, pending: boolean) {
      if (pending) lapseCopyPendingFor.value[uid] = true
      else delete lapseCopyPendingFor.value[uid]
    }

    function rememberMember(uid: string) {
      lastMemberUid.value = uid
    }

    function forgetMember() {
      lastMemberUid.value = null
    }

    function setReady() {
      ready.value = true
    }

    return {
      saveState,
      pendingImportIds,
      pendingImport,
      importFailed,
      importDeclinedFor,
      copiedFrom,
      lapseCopyPendingFor,
      lastMemberUid,
      ready,
      setSaveState,
      setPendingImport,
      setImportFailed,
      declineImport,
      undeclineImport,
      markCopiedFrom,
      forgetCopies,
      setLapseCopyPending,
      rememberMember,
      forgetMember,
      setReady,
    }
  },
  {
    persist: {
      version: 1,
      pick: ['importDeclinedFor', 'copiedFrom', 'lapseCopyPendingFor', 'lastMemberUid'],
      schema: z.object({
        importDeclinedFor: z.record(z.string(), z.literal(true)),
        copiedFrom: z.record(z.string(), z.string()).default({}),
        lapseCopyPendingFor: z.record(z.string(), z.literal(true)).default({}),
        lastMemberUid: z.string().nullable(),
      }),
    },
  },
)
