// The storage driver: decides where games live from the live membership
// status and performs the explicit, one-time copies between the device and
// the cloud. Firestore (with its offline cache) does the actual syncing —
// there is no merge logic here. See docs/plans/membership-and-storage.md.
//
//   signed in ──► users/{uid} listener ──► membership store (status)
//   member / graceful  → cloud backend attached (games + house rules)
//   lapsed             → local backend; cloud games copied once to devices it was a member on
//   anything else      → local backend
//
// registerSync() is called once at startup (main.ts).

import { watch, ref } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, clearCloudCache } from './firebase'
import { mergeById, toPlain } from './cloud'
import {
  fetchSessions,
  removeSession,
  saveHouseRules,
  saveSession,
  uploadSessions,
  watchHouseRules,
  watchSessions,
  watchUserDoc,
} from './cloudBackend'
import { useMembershipStore } from '../stores/membership'
import { useSessionsStore } from '../stores/sessions'
import { useSettingsStore } from '../stores/settings'
import { useSyncStore } from '../stores/sync'
import type { Session } from '../domain/types'

/** The Firebase-confirmed uid (unlike the persisted account store, never stale). */
const authUid = ref<string | null>(null)

let userDocUnsub: (() => void) | null = null
let cloud: { uid: string; unsubs: Array<() => void> } | null = null
let hasPendingWrites = false
let writeFailed = false
let copyingDown = false
// Set while the user is deliberately leaving the cloud (account deletion):
// the server cancels Stripe before deleting data, which looks like a lapse —
// that must NOT copy the games onto the device behind the user's back.
let leaving = false

/** An import of device games the server hasn't confirmed yet. */
interface Upload {
  uid: string
  ids: string[]
}
const uploads = new Set<Upload>()

function refreshSaveState() {
  const sync = useSyncStore()
  if (!cloud) sync.setSaveState('local')
  else if (writeFailed) sync.setSaveState('error')
  else if (hasPendingWrites) sync.setSaveState(navigator.onLine ? 'saving' : 'offline')
  else sync.setSaveState('saved')
}

/** Follows a write to the server: flags a rejection, clears it on success. */
function track(write: Promise<void>) {
  write.then(
    () => {
      writeFailed = false
      refreshSaveState()
    },
    (err: unknown) => {
      console.error('[cloud] write rejected', err)
      writeFailed = true
      refreshSaveState()
    },
  )
}

function attachCloud(uid: string) {
  if (cloud?.uid === uid) return
  detachCloud()
  const sessions = useSessionsStore()
  const settings = useSettingsStore()
  const sync = useSyncStore()

  sessions.useCloud({
    save: (session) => track(saveSession(uid, session)),
    remove: (sessionId) => track(removeSession(uid, sessionId)),
  })
  settings.setHouseRulesWriter((rules) => track(saveHouseRules(uid, rules)))

  const unsubs: Array<() => void> = []
  unsubs.push(
    watchSessions(
      uid,
      (snap) => {
        sessions.setCloudSessions(snap.sessions)
        hasPendingWrites = snap.hasPendingWrites
        refreshSaveState()
      },
      (err) => console.error('[cloud] sessions listener failed', err),
    ),
  )
  let rulesSeeded = false
  unsubs.push(
    watchHouseRules(
      uid,
      (rules, { exists, fromCache }) => {
        if (rules) {
          settings.adoptHouseRules(rules)
        } else if (exists) {
          // Saved but unreadable (e.g. by another app version): never overwrite it.
          console.warn('[cloud] ignoring house rules this version cannot read')
        } else if (!fromCache && !rulesSeeded) {
          // First time in the cloud: the device's rules become the account's.
          rulesSeeded = true
          track(saveHouseRules(uid, toPlain(settings.houseRules)))
        }
      },
      (err) => console.error('[cloud] house rules listener failed', err),
    ),
  )
  cloud = { uid, unsubs }

  // A member again: nothing left to copy down from a past lapse.
  sync.setLapseCopyPending(uid, false)
  offerImport(uid)
  refreshSaveState()
}

/**
 * Device games worth offering to `uid` for upload: everything except copies of
 * that account's own cloud games, which may be older than the cloud by now.
 */
function importableGames(uid: string): Session[] {
  const copiedFrom = useSyncStore().copiedFrom
  return useSessionsStore().localSessions.filter((s) => copiedFrom[s.id] !== uid)
}

/** Offline games on this device: ask before uploading them (never automatic —
 * on a borrowed device they may not be this account's games). */
function offerImport(uid: string) {
  const sync = useSyncStore()
  const ids = importableGames(uid).map((s) => s.id)
  sync.setPendingImport(sync.importDeclinedFor[uid] ? [] : ids)
}

/**
 * Puts copies of `uid`'s cloud games on the device, remembered as copies.
 * A device game with the same id that was edited here (no longer marked as a
 * copy) is kept — the cloud must not silently undo those edits.
 */
function copyToDevice(uid: string, games: Session[]) {
  const sessions = useSessionsStore()
  const sync = useSyncStore()
  const local = new Set(sessions.localSessions.map((s) => s.id))
  const replaceable = games.filter((s) => !local.has(s.id) || sync.copiedFrom[s.id] === uid)
  sessions.setLocalSessions(mergeById(sessions.localSessions, replaceable))
  sync.markCopiedFrom(uid, replaceable.map((s) => s.id))
}

/** Device-game actions that change a session (first argument: its id). */
const LOCAL_EDIT_ACTIONS = new Set([
  'addRound',
  'updateRound',
  'deleteRound',
  'finishSession',
  'reopenSession',
  'deleteSession',
])

/**
 * A copy of cloud games that's edited on the device is no longer just a copy:
 * drop its mark so it's offered for upload next time that account is a member.
 */
function trackLocalEdits() {
  const sessions = useSessionsStore()
  const sync = useSyncStore()
  sessions.$onAction(({ name, args, after }) => {
    if (!LOCAL_EDIT_ACTIONS.has(name) || sessions.usingCloud) return
    const sessionId = args[0] as string
    after(() => {
      const owner = sync.copiedFrom[sessionId]
      if (owner === undefined) return
      sync.forgetCopies([sessionId])
      // Deleting a copy isn't news for the account; an edit is.
      if (name !== 'deleteSession') sync.undeclineImport(owner)
    })
  })
}

function detachCloud() {
  if (!cloud) return
  for (const unsubscribe of cloud.unsubs) unsubscribe()
  cloud = null
  useSessionsStore().useLocal()
  useSettingsStore().setHouseRulesWriter(null)
  useSyncStore().setPendingImport([])
  hasPendingWrites = false
  writeFailed = false
  refreshSaveState()
}

/** Subscription ended: keep using the games on this device. Reads stay allowed, so copy once. */
async function copyDownAfterLapse(uid: string) {
  const sync = useSyncStore()
  if (!sync.lapseCopyPendingFor[uid] || copyingDown || leaving) return
  copyingDown = true
  try {
    const cloudGames = await fetchSessions(uid)
    if (authUid.value !== uid || leaving) return
    copyToDevice(uid, cloudGames)
    sync.setLapseCopyPending(uid, false)
  } catch (err) {
    // Still pending: retried when back online, or on the next launch.
    console.error('[cloud] copy-down after lapse failed', err)
  } finally {
    copyingDown = false
  }
}

/** Registered once at startup. */
export function registerSync(): void {
  const membership = useMembershipStore()

  // Games aren't shown until the first auth state arrives (sync.ready, see
  // App.vue) — otherwise a member would briefly see the device's games. The
  // backend watcher below runs before the next render, so it's in place by then.
  onAuthStateChanged(auth, (user) => {
    authUid.value = user?.uid ?? null
    useSyncStore().setReady()
  })

  // Membership is fed by a live listener on the server-written users/{uid}.
  watch(
    authUid,
    (uid) => {
      userDocUnsub?.()
      userDocUnsub = null
      membership.reset()
      if (!uid) return
      userDocUnsub = watchUserDoc(
        uid,
        (doc) => membership.setUserDoc(doc),
        (err) => console.error('[cloud] membership listener failed', err),
      )
    },
    { immediate: true },
  )

  // Membership decides the backend.
  const sync = useSyncStore()
  watch(
    () => [authUid.value, membership.status] as const,
    ([uid, status]) => {
      if (!uid) return detachCloud()
      if (status === 'checking') {
        // Not known yet: trust what this device last saw for this account.
        if (sync.lastMemberUid === uid) attachCloud(uid)
        return
      }
      if (status === 'member' || status === 'graceful') {
        sync.rememberMember(uid)
        return attachCloud(uid)
      }
      const wasMemberHere = sync.lastMemberUid === uid
      if (wasMemberHere) sync.forgetMember()
      detachCloud()
      if (status === 'lapsed') {
        // Only a device this account was a member on gets the copy (kept
        // pending until it succeeds) — not one it merely signs in on.
        if (wasMemberHere && !leaving) sync.setLapseCopyPending(uid, true)
        void copyDownAfterLapse(uid)
      }
    },
    { immediate: true },
  )

  trackLocalEdits()

  window.addEventListener('online', () => {
    refreshSaveState()
    // A lapse copy-down that failed offline: retry now rather than next launch.
    if (authUid.value) void copyDownAfterLapse(authUid.value)
  })
  window.addEventListener('offline', refreshSaveState)
}

// ── UI actions ──────────────────────────────────────────────────────

/**
 * "Sí, subirlas": uploads the device's offline games, then clears them locally.
 * Doesn't wait for the server: Firestore's cache shows them in the account at
 * once, while the server's confirmation may only come when back online.
 */
export function importLocalGames(): void {
  const uid = cloud?.uid
  if (!uid) return
  const sessions = useSessionsStore()
  const sync = useSyncStore()
  const games = toPlain(importableGames(uid))
  const ids = games.map((s) => s.id)
  // From now on they're this account's games — not offered again unless the upload fails.
  sync.markCopiedFrom(uid, ids)
  sync.setPendingImport([])
  sync.setImportFailed(false)
  const upload: Upload = { uid, ids }
  uploads.add(upload)
  uploadSessions(uid, games).then(
    () => {
      // Abandoned at sign-out (leaveCloud already handled it).
      if (!uploads.delete(upload)) return
      // No longer a member here: they simply stay on the device as copies.
      if (cloud?.uid !== uid) return
      // Only drop the device copies once the server has them.
      const uploaded = new Set(ids)
      sessions.setLocalSessions(sessions.localSessions.filter((s) => !uploaded.has(s.id)))
      sync.forgetCopies(ids)
    },
    (err: unknown) => {
      console.error('[cloud] upload of device games rejected', err)
      if (!uploads.delete(upload)) return
      // Still on the device: offer them again.
      sync.forgetCopies(ids)
      sync.setImportFailed(true)
      if (cloud?.uid === uid) offerImport(uid)
    },
  )
}

/** "No, dejarlas acá": they stay on the device (shown again when signed out). */
export function declineLocalImport(): void {
  const uid = cloud?.uid
  if (uid) useSyncStore().declineImport(uid)
}

export interface CloudCopy {
  uid: string
  games: Session[]
}

/** A snapshot of the member's cloud games, to keep on the device with keepOnDevice. */
export function snapshotCloudGames(): CloudCopy | null {
  const uid = cloud?.uid
  if (!uid) return null
  return { uid, games: toPlain(useSessionsStore().cloudSessions) }
}

/** Keeps a snapshot's games on this device (before sign-out / after deletion). */
export function keepOnDevice(copy: CloudCopy | null): void {
  if (copy) copyToDevice(copy.uid, copy.games)
}

/**
 * Runs `work` (e.g. the account-deletion request) with the lapse copy-down
 * suppressed, so its side effects can't copy games onto the device.
 */
export async function whileLeavingCloud<T>(work: () => Promise<T>): Promise<T> {
  leaving = true
  try {
    return await work()
  } finally {
    leaving = false
  }
}

/**
 * Leaves the cloud on this device: stops listening and wipes Firestore's
 * offline cache so the next person can't read this account's games.
 */
export async function leaveCloud(): Promise<void> {
  // Uploads the server never confirmed die with the cache. Those games are
  // still on the device, so they become plain device games again — offered
  // for upload next time instead of stranded as "copies".
  for (const upload of uploads) useSyncStore().forgetCopies(upload.ids)
  uploads.clear()
  detachCloud()
  userDocUnsub?.()
  userDocUnsub = null
  useMembershipStore().reset()
  useSyncStore().forgetMember()
  await clearCloudCache()
}
