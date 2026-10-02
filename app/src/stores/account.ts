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
    // Billing entitlement, sourced from users/{uid}.cloudSync in Firestore
    // (written only by the Stripe webhook). Signing in is necessary but not
    // sufficient for cloud sync — the Club subscription is what unlocks it.
    const entitled = ref(false)

    /** First launch only — the router redirects to the welcome gate. */
    const needsWelcome = computed(() => mode.value === 'unset')
    /** True once signed in, regardless of subscription — used to show the upgrade CTA. */
    const isSignedIn = computed(() => mode.value === 'signedIn' && user.value !== null)
    /** The one flag cloud persistence is allowed to key off: signed in AND paid. */
    const cloudSyncEnabled = computed(() => isSignedIn.value && entitled.value)

    function continueOffline() {
      mode.value = 'offline'
      user.value = null
      entitled.value = false
    }

    // Only the Firebase Auth integration may call this — the UI never flips
    // itself into signed-in mode directly.
    function setSignedIn(nextUser: AccountUser) {
      mode.value = 'signedIn'
      user.value = nextUser
    }

    /** Set from the Firestore entitlement lookup after sign-in / on webhook refresh. */
    function setEntitled(next: boolean) {
      entitled.value = next
    }

    /** Local data survives sign-out; the device just drops back to the free offline tier. */
    function signOut() {
      mode.value = 'offline'
      user.value = null
      entitled.value = false
    }

    return {
      mode,
      user,
      entitled,
      needsWelcome,
      isSignedIn,
      cloudSyncEnabled,
      continueOffline,
      setSignedIn,
      setEntitled,
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
        // Added after v1 shipped. `.default` keeps pre-existing persisted state
        // (which has no `entitled` key) parsing cleanly instead of being wiped —
        // the persistence plugin keys storage on version and doesn't run
        // migrate(), so backward-compatible schema is the safe path here.
        entitled: z.boolean().default(false),
      }),
    },
  },
)
