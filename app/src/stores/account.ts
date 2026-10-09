import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { z } from 'zod'

/**
 * 'unset'    — first launch, the user hasn't chosen yet (welcome gate shows)
 * 'offline'  — free tier: everything lives in this device's localStorage
 * 'signedIn' — signed in with Google (membership decides whether games sync)
 */
export const ACCOUNT_MODES = ['unset', 'offline', 'signedIn'] as const
export type AccountMode = (typeof ACCOUNT_MODES)[number]

export interface AccountUser {
  id: string
  email: string
  displayName: string | null
}

/**
 * Identity only: who (if anyone) is signed in. Whether they're a Club member
 * — and so whether anything syncs — is the membership store's job, derived
 * live from the server.
 */
export const useAccountStore = defineStore(
  'account',
  () => {
    const mode = ref<AccountMode>('unset')
    const user = ref<AccountUser | null>(null)

    /** First launch only — the router redirects to the welcome gate. */
    const needsWelcome = computed(() => mode.value === 'unset')
    const isSignedIn = computed(() => mode.value === 'signedIn' && user.value !== null)

    function continueOffline() {
      mode.value = 'offline'
      user.value = null
    }

    // Only the Firebase Auth integration (lib/auth.ts) may call this — the UI
    // never flips itself into signed-in mode directly.
    function setSignedIn(nextUser: AccountUser) {
      mode.value = 'signedIn'
      user.value = nextUser
    }

    /** The device drops back to the free offline tier. */
    function signOut() {
      mode.value = 'offline'
      user.value = null
    }

    return {
      mode,
      user,
      needsWelcome,
      isSignedIn,
      continueOffline,
      setSignedIn,
      signOut,
    }
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
