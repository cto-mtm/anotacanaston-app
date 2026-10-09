import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { useAccountStore } from './account'
import { capabilitiesFor, deriveMembership, type UserDoc, type UserDocState } from '../domain/membership'

/**
 * Club membership, derived live from the server-written users/{uid} doc
 * (fed by lib/sync.ts). Never persisted: on launch a signed-in user is
 * `checking` until the first snapshot — Firestore's offline cache usually
 * answers instantly. The UI reads `capabilities`, never Stripe fields.
 */
export const useMembershipStore = defineStore('membership', () => {
  const account = useAccountStore()
  const isNative = Capacitor.isNativePlatform()

  const userDoc = ref<UserDocState>(undefined)

  const status = computed(() => deriveMembership(account.isSignedIn, userDoc.value))
  const capabilities = computed(() => capabilitiesFor(status.value, userDoc.value, isNative))
  const memberSince = computed(() => userDoc.value?.memberSince ?? null)
  const renewsAt = computed(() => (userDoc.value?.cancelAtPeriodEnd ? null : (userDoc.value?.currentPeriodEnd ?? null)))
  const endsAt = computed(() => (userDoc.value?.cancelAtPeriodEnd ? (userDoc.value.currentPeriodEnd ?? null) : null))

  function setUserDoc(next: UserDoc | null) {
    userDoc.value = next
  }

  /** Signed out, or a new account signing in: back to "unknown". */
  function reset() {
    userDoc.value = undefined
  }

  return { userDoc, status, capabilities, memberSince, renewsAt, endsAt, setUserDoc, reset }
})
