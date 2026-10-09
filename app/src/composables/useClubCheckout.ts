import { ref } from 'vue'
import { useAccountStore } from '../stores/account'
import { signInForClub } from '../lib/auth'
import { AlreadySubscribedError, startClubCheckout } from '../lib/billing'

/**
 * "Join Club" from anywhere (Club modal, Welcome): sign in with Google if
 * needed, then go to Stripe Checkout. An account that already has Club (e.g.
 * a subscriber on a new device) is never sent to checkout — `alreadyMember`
 * flips instead, and the live membership listener starts sync on its own.
 */
export function useClubCheckout() {
  const account = useAccountStore()
  /** True from the tap until Stripe takes over (or it fails). */
  const busy = ref(false)
  const error = ref(false)
  const alreadyMember = ref(false)

  async function subscribe() {
    if (busy.value) return
    busy.value = true
    error.value = false
    try {
      if (!account.isSignedIn && (await signInForClub())) {
        alreadyMember.value = true
        busy.value = false
        return
      }
      await startClubCheckout() // redirects away on success; `busy` stays true meanwhile
    } catch (err) {
      if (err instanceof AlreadySubscribedError) alreadyMember.value = true
      else error.value = true
      busy.value = false
    }
  }

  function reset() {
    error.value = false
    alreadyMember.value = false
  }

  return { busy, error, alreadyMember, subscribe, reset }
}
