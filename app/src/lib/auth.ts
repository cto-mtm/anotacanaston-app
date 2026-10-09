// Firebase Auth ↔ account store, plus the account-level UI actions. This is
// the ONLY place that flips the account store into signed-in mode
// (account.setSignedIn) — per the store's contract, the UI never does it.
//
// Membership and storage are NOT decided here: lib/sync.ts derives them live
// from the server. This file just identifies the user and orchestrates the
// sign-out / deletion steps.

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { watch } from 'vue'
import { auth } from './firebase'
import { deleteCloudAccount } from './billing'
import { keepOnDevice, leaveCloud, snapshotCloudGames, whileLeavingCloud } from './sync'
import { useAccountStore } from '../stores/account'
import { useMembershipStore } from '../stores/membership'

function toAccountUser(user: User) {
  return {
    id: user.uid,
    email: user.email ?? '',
    displayName: user.displayName,
  }
}

/** Registered once at startup. Bridges Firebase auth state into the account store. */
export function registerAuth(): void {
  const account = useAccountStore()
  onAuthStateChanged(auth, (user) => {
    if (user) {
      account.setSignedIn(toAccountUser(user))
    } else if (account.mode === 'signedIn') {
      // Only downgrade if we were signed in; leaves a fresh 'unset' launch alone.
      account.signOut()
    }
  })
}

/** UI action: Google sign-in via popup (web). onAuthStateChanged updates the store. */
export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, new GoogleAuthProvider())
}

/** Resolves once the membership status is known (or after `timeoutMs`). */
function membershipKnown(timeoutMs = 8000): Promise<void> {
  const membership = useMembershipStore()
  const known = () => membership.status !== 'checking' && membership.status !== 'anonymous'
  if (known()) return Promise.resolve()
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer)
      stop()
      resolve()
    }
    const timer = setTimeout(finish, timeoutMs)
    const stop = watch(known, (isKnown) => {
      if (isKnown) finish()
    })
  })
}

/**
 * UI action from the Club modal: sign in, then report whether this account
 * already has Club — a subscriber on a new device must not be sent to checkout.
 */
export async function signInForClub(): Promise<boolean> {
  await signInWithGoogle()
  await membershipKnown()
  return useMembershipStore().capabilities.canSync
}

/**
 * UI action: sign out. With `keepCopy`, a member's cloud games are first
 * copied onto this device; either way Firestore's offline cache is wiped.
 */
export async function signOutCloud({ keepCopy }: { keepCopy: boolean } = { keepCopy: false }): Promise<void> {
  if (keepCopy) keepOnDevice(snapshotCloudGames())
  await leaveCloud()
  await fbSignOut(auth)
}

/**
 * UI action: delete the account and its cloud data (cancels Club). With
 * `keepCopy`, the cloud games are copied onto this device first — they'd be
 * gone afterwards. Throws (and changes nothing else) if the server fails.
 */
export async function deleteAccountAndSignOut({ keepCopy }: { keepCopy: boolean }): Promise<void> {
  // Snapshot now (the live list empties as the server deletes), but only put
  // it on the device once the deletion has succeeded.
  const copy = keepCopy ? snapshotCloudGames() : null
  // Cancelling the subscription server-side briefly looks like a lapse; keep
  // that from copying games here (the user already chose above).
  await whileLeavingCloud(async () => {
    await deleteCloudAccount()
    keepOnDevice(copy)
    await leaveCloud()
    // The auth user no longer exists server-side; this clears the local session.
    await fbSignOut(auth)
  })
}
