// Auth + cloud-sync orchestration. This is the ONLY place that flips the
// account store into signed-in mode (account.setSignedIn) — per the store's
// contract, the UI never does it directly.
//
// registerAuth() is called once at startup (like registerNative). It subscribes
// to Firebase auth state and, on sign-in, looks up the billing entitlement and
// runs an initial two-way session merge. While signed-in + entitled, local
// session mutations are pushed up (debounced via Pinia $subscribe). The same
// entitlement refresh runs after a Stripe Checkout return, so paying starts
// sync without a reload.

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { auth } from './firebase'
import {
  fetchCloudState,
  fetchEntitlement,
  mergeSessions,
  pushSessions,
  pushTombstones,
  type Tombstones,
} from './cloud'
import { useAccountStore } from '../stores/account'
import { useSessionsStore } from '../stores/sessions'

let syncUnsub: (() => void) | null = null
// The uid sync is running (or starting) for — guards against the auth listener
// and the checkout-return poll both kicking off an initial merge.
let syncingUid: string | null = null

function toAccountUser(user: User) {
  return {
    id: user.uid,
    email: user.email ?? '',
    displayName: user.displayName,
  }
}

/** Registered once at startup. Bridges Firebase auth state into the app. */
export function registerAuth(): void {
  const account = useAccountStore()

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      teardownSync()
      // Only downgrade if we were signed in; leaves a fresh 'unset' launch alone.
      if (account.mode === 'signedIn') account.signOut()
      return
    }

    account.setSignedIn(toAccountUser(user))
    await refreshEntitlement(user.uid)
  })
}

/**
 * Re-reads the billing entitlement and starts or stops sync to match. Safe to
 * call repeatedly: the initial merge runs once per signed-in uid.
 */
async function refreshEntitlement(uid: string): Promise<boolean> {
  const account = useAccountStore()
  let entitled = false
  try {
    entitled = await fetchEntitlement(uid)
  } catch {
    entitled = false
  }
  account.setEntitled(entitled)

  if (!entitled) {
    teardownSync()
  } else if (syncingUid !== uid) {
    syncingUid = uid
    await runInitialMerge(uid)
    startSyncWatcher(uid)
  }
  return entitled
}

/**
 * Stripe Checkout return. The page has just reloaded, so wait for Firebase to
 * restore the user, then poll — the webhook that grants the entitlement may
 * land a few seconds after the redirect. Starts sync as soon as it does.
 */
export async function awaitCheckoutEntitlement(attempts = 5, delayMs = 1500): Promise<boolean> {
  await auth.authStateReady()
  const uid = auth.currentUser?.uid
  if (!uid) return false
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (await refreshEntitlement(uid)) return true
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
  return false
}

/** Pulls cloud state, merges with local (last-write-wins), pushes deltas up. */
async function runInitialMerge(uid: string): Promise<void> {
  const sessionsStore = useSessionsStore()
  try {
    const cloud = await fetchCloudState(uid)
    const { merged, toPush, tombstones, toDelete } = mergeSessions(
      sessionsStore.sessions,
      cloud,
      sessionsStore.sessionStamps,
      sessionsStore.deletedStamps,
    )
    sessionsStore.adoptMerged(merged, tombstones)
    if (toPush.length > 0) await pushSessions(uid, toPush)
    if (Object.keys(toDelete).length > 0) await pushTombstones(uid, toDelete)
  } catch (err) {
    // Sync is best-effort; a failed merge must never break the local app.
    console.error('[cloud] initial merge failed', err)
  }
}

/**
 * Watches the sessions store and pushes changed sessions up while entitled.
 * Debounced by comparing stamps against the last push high-water mark.
 */
function startSyncWatcher(uid: string): void {
  const account = useAccountStore()
  const sessionsStore = useSessionsStore()
  if (syncUnsub) syncUnsub()

  let lastPush = Date.now()
  let timer: ReturnType<typeof setTimeout> | undefined

  syncUnsub = sessionsStore.$subscribe(() => {
    if (!account.cloudSyncEnabled) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(async () => {
      const cutoff = lastPush
      const changed = sessionsStore.sessions.filter(
        (s) => (sessionsStore.sessionStamps[s.id] ?? 0) > cutoff,
      )
      const deleted: Tombstones = Object.fromEntries(
        Object.entries(sessionsStore.deletedStamps).filter(([, stamp]) => stamp > cutoff),
      )
      lastPush = Date.now()
      try {
        if (changed.length > 0) await pushSessions(uid, changed)
        if (Object.keys(deleted).length > 0) await pushTombstones(uid, deleted)
      } catch (err) {
        console.error('[cloud] push failed', err)
      }
    }, 800)
  })
}

function teardownSync(): void {
  if (syncUnsub) {
    syncUnsub()
    syncUnsub = null
  }
  syncingUid = null
}

/** UI action: Google sign-in via popup (web) — resolves once auth state flips. */
export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider()
  await signInWithPopup(auth, provider)
}

/** UI action: sign out. onAuthStateChanged handles the store downgrade. */
export async function signOutCloud(): Promise<void> {
  await fbSignOut(auth)
}
