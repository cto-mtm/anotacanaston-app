import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { z } from 'zod'

/**
 * 'unset'    — first launch, the user hasn't chosen yet (welcome gate shows)
 * 'offline'  — free tier: everything lives in this device's localStorage
 * 'signedIn' — paid tier candidate: cloud sync becomes possible
 */
export const ACCOUNT_MODES = ['unset', 'offline', 'signedIn'] as const
export type AccountMode = (typeof ACCOUNT_MODES)[number]

export interface AccountUser {
  id: string
  email: string
  displayName: string | null
}

/**
 * Single source of truth for the offline/online business logic. Anything
 * that talks to the cloud must check `cloudSyncEnabled` here — no other
 * store or component decides on its own whether the user is online.
 */
export const useAccountStore = defineStore(
  'account',
  () => {
    const mode = ref<AccountMode>('unset')
    const user = ref<AccountUser | null>(null)

    /** First launch only — the router redirects to the welcome gate. */
    const needsWelcome = computed(() => mode.value === 'unset')
    /** The one flag cloud persistence is allowed to key off. */
    const cloudSyncEnabled = computed(() => mode.value === 'signedIn' && user.value !== null)

    function continueOffline() {
      mode.value = 'offline'
      user.value = null
    }

    // Only the future Firebase Auth integration may call this — the UI
    // never flips itself into signed-in mode directly.
    function setSignedIn(nextUser: AccountUser) {
      mode.value = 'signedIn'
      user.value = nextUser
    }

    /** Local data survives sign-out; the device just drops back to the free offline tier. */
    function signOut() {
      mode.value = 'offline'
      user.value = null
    }

    return { mode, user, needsWelcome, cloudSyncEnabled, continueOffline, setSignedIn, signOut }
  },
  {
    persist: {
      version: 1,
      schema: z.object({
        mode: z.enum(ACCOUNT_MODES),
        user: z
          .object({ id: z.string(), email: z.string(), displayName: z.string().nullable() })
          .nullable(),
      }),
    },
  },
)
