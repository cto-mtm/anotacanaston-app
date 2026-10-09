import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DEFAULT_RULES } from '../domain/rules'
import type { Session } from '../domain/types'
import type { UserDoc } from '../domain/membership'

// The storage driver, run for real against its stores, with Firebase replaced
// by in-memory fakes. Covers the copy rules between the device and the cloud.

const fake = vi.hoisted(() => ({
  authListener: null as ((user: { uid: string } | null) => void) | null,
  userDocListener: null as ((doc: unknown) => void) | null,
  sessionsListener: null as ((snap: unknown) => void) | null,
  uploads: [] as Array<{ games: Session[]; resolve: () => void; reject: (err: unknown) => void }>,
  fetchSessions: vi.fn(),
  clearCloudCache: vi.fn(),
}))

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, listener: (user: { uid: string } | null) => void) => {
    fake.authListener = listener
    return () => {}
  },
}))
vi.mock('./firebase', () => ({ auth: {}, clearCloudCache: fake.clearCloudCache }))
vi.mock('./cloudBackend', () => ({
  watchUserDoc: (_uid: string, onData: (doc: unknown) => void) => {
    fake.userDocListener = onData
    return () => {
      fake.userDocListener = null
    }
  },
  watchSessions: (_uid: string, onData: (snap: unknown) => void) => {
    fake.sessionsListener = onData
    return () => {
      fake.sessionsListener = null
    }
  },
  watchHouseRules: () => () => {},
  saveSession: () => Promise.resolve(),
  removeSession: () => Promise.resolve(),
  saveHouseRules: () => Promise.resolve(),
  uploadSessions: (_uid: string, games: Session[]) =>
    new Promise<void>((resolve, reject) => fake.uploads.push({ games, resolve, reject })),
  fetchSessions: fake.fetchSessions,
}))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))

function session(id: string): Session {
  return {
    id,
    date: '2026-01-01',
    createdAt: 0,
    playerCount: 4,
    players: [{ id: 'p1', name: 'Ana' }],
    manoId: 'p1',
    initialDealerId: 'p1',
    plannedGames: 1,
    rules: DEFAULT_RULES,
    games: [],
    status: 'in_progress',
  }
}

/** Lets watchers and promise callbacks run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

const windowListeners = new Map<string, () => void>()

// sync.ts keeps module-level state, so every test gets fresh modules.
let sync: typeof import('./sync')
let sessions: ReturnType<typeof import('../stores/sessions').useSessionsStore>
let syncStore: ReturnType<typeof import('../stores/sync').useSyncStore>
let account: ReturnType<typeof import('../stores/account').useAccountStore>

beforeEach(async () => {
  vi.resetModules()
  windowListeners.clear()
  vi.stubGlobal('window', {
    addEventListener: (type: string, listener: () => void) => windowListeners.set(type, listener),
  })
  vi.stubGlobal('navigator', { onLine: true })
  fake.uploads.length = 0
  fake.fetchSessions.mockReset()
  fake.clearCloudCache.mockReset().mockResolvedValue(undefined)
  setActivePinia(createPinia())

  sync = await import('./sync')
  sessions = (await import('../stores/sessions')).useSessionsStore()
  syncStore = (await import('../stores/sync')).useSyncStore()
  account = (await import('../stores/account')).useAccountStore()
  sync.registerSync()
  await settle()
})

async function signIn(uid: string) {
  account.setSignedIn({ id: uid, email: `${uid}@example.com`, displayName: null })
  fake.authListener!({ uid })
  await settle()
}

async function setMembership(doc: UserDoc | null) {
  fake.userDocListener!(doc)
  await settle()
}

async function becomeMember(uid: string, cloudGames: Session[] = []) {
  await signIn(uid)
  await setMembership({ subscriptionStatus: 'active', cloudSync: true })
  fake.sessionsListener!({ sessions: cloudGames, hasPendingWrites: false, fromCache: false })
  await settle()
}

/** Sign-out as auth.ts does it: optional copy, leave the cloud, auth goes null. */
async function signOut({ keepCopy }: { keepCopy: boolean }) {
  if (keepCopy) sync.keepOnDevice(sync.snapshotCloudGames())
  await sync.leaveCloud()
  account.signOut()
  fake.authListener!(null)
  await settle()
}

const localIds = () => sessions.localSessions.map((s) => s.id)

describe('lapse copy-down', () => {
  it('copies the cloud games to a device the account was a member on', async () => {
    await becomeMember('u1', [session('a')])
    fake.fetchSessions.mockResolvedValue([session('a')])

    await setMembership({ subscriptionStatus: 'canceled', cloudSync: false })

    expect(sessions.usingCloud).toBe(false)
    expect(localIds()).toEqual(['a'])
    expect(syncStore.copiedFrom).toEqual({ a: 'u1' })
    expect(syncStore.lapseCopyPendingFor).toEqual({})
  })

  it('copies nothing to a device the account only signs in on', async () => {
    await signIn('u2')
    await setMembership({ subscriptionStatus: 'canceled', cloudSync: false })

    expect(fake.fetchSessions).not.toHaveBeenCalled()
    expect(localIds()).toEqual([])
  })

  async function lapseWhileOffline() {
    await becomeMember('u1')
    fake.fetchSessions.mockRejectedValueOnce(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await setMembership({ subscriptionStatus: 'canceled', cloudSync: false })
    expect(localIds()).toEqual([])
    expect(syncStore.lapseCopyPendingFor).toEqual({ u1: true })
    fake.fetchSessions.mockResolvedValue([session('a')])
  }

  it('retries a failed copy when the device comes back online', async () => {
    await lapseWhileOffline()

    windowListeners.get('online')!()
    await settle()

    expect(localIds()).toEqual(['a'])
    expect(syncStore.lapseCopyPendingFor).toEqual({})
  })

  it('retries a failed copy on the next launch', async () => {
    await lapseWhileOffline()

    // Relaunch: auth is restored and membership re-checked from scratch.
    fake.authListener!(null)
    await settle()
    await signIn('u1')
    await setMembership({ subscriptionStatus: 'canceled', cloudSync: false })

    expect(localIds()).toEqual(['a'])
  })

  it('does not copy when the account is rejoined before the retry', async () => {
    await lapseWhileOffline()
    await setMembership({ subscriptionStatus: 'active', cloudSync: true })
    expect(syncStore.lapseCopyPendingFor).toEqual({})

    windowListeners.get('online')!()
    await settle()
    expect(localIds()).toEqual([])
  })
})

describe('kept copies', () => {
  it('are not offered for upload back to the same account', async () => {
    await becomeMember('u1', [session('a')])
    await signOut({ keepCopy: true })
    expect(localIds()).toEqual(['a'])

    await becomeMember('u1', [session('a')])
    expect(syncStore.pendingImportIds).toEqual([])
  })

  it('are offered again once edited on the device, even after an earlier "no"', async () => {
    sessions.setLocalSessions([session('offline')])
    await becomeMember('u1', [session('a')])
    sync.declineLocalImport()
    await signOut({ keepCopy: true })

    sessions.finishSession('a')
    expect(syncStore.copiedFrom).toEqual({})

    await becomeMember('u1', [session('a')])
    expect([...syncStore.pendingImportIds].sort()).toEqual(['a', 'offline'])
  })

  it('deleting a copy only drops its mark', async () => {
    await becomeMember('u1', [session('a')])
    sync.declineLocalImport()
    await signOut({ keepCopy: true })

    sessions.deleteSession('a')
    expect(syncStore.copiedFrom).toEqual({})
    expect(syncStore.importDeclinedFor).toEqual({ u1: true })
  })

  it('never overwrite a device game that was edited here', async () => {
    await becomeMember('u1', [session('a')])
    await signOut({ keepCopy: true })
    sessions.finishSession('a')

    await becomeMember('u1', [session('a')])
    await signOut({ keepCopy: true })

    expect(sessions.localSessions[0].status).toBe('finished')
  })
})

describe('importing device games', () => {
  it('removes the device copies once the server confirms', async () => {
    sessions.setLocalSessions([session('x')])
    await becomeMember('u1')
    expect(syncStore.pendingImportIds).toEqual(['x'])

    sync.importLocalGames()
    expect(syncStore.pendingImport).toBe(0)
    expect(syncStore.copiedFrom).toEqual({ x: 'u1' })

    fake.uploads[0].resolve()
    await settle()
    expect(localIds()).toEqual([])
    expect(syncStore.copiedFrom).toEqual({})
  })

  it('offers them again when the server rejects the upload', async () => {
    sessions.setLocalSessions([session('x')])
    await becomeMember('u1')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    sync.importLocalGames()
    fake.uploads[0].reject(new Error('permission-denied'))
    await settle()

    expect(localIds()).toEqual(['x'])
    expect(syncStore.importFailed).toBe(true)
    expect(syncStore.pendingImportIds).toEqual(['x'])
  })

  it('an upload still in flight at sign-out leaves plain device games, offered next time', async () => {
    sessions.setLocalSessions([session('x')])
    await becomeMember('u1')
    sync.importLocalGames()

    await signOut({ keepCopy: false })
    expect(syncStore.copiedFrom).toEqual({})

    // A late confirmation must not remove anything now.
    fake.uploads[0].resolve()
    await settle()
    expect(localIds()).toEqual(['x'])

    await becomeMember('u1')
    expect(syncStore.pendingImportIds).toEqual(['x'])
  })
})
