// Firestore session sync for Club (cloud-sync) members.
//
// Data model: users/{uid}/sessions/{sessionId}, one doc per Session, shaped
// exactly like the local Session (validated by the same sessionSchema on the
// way back in). users/{uid} itself holds the billing entitlement, written only
// by the Stripe webhook Cloud Function — the client never writes it (enforced
// by security rules).
//
// Conflict policy: last-write-wins per session, keyed on an `updatedAt`
// millisecond timestamp we stamp on every push. On sign-in we merge both
// directions: newer side wins per session id; sessions missing on one side are
// copied over. This is deliberately simple — sessions are append-mostly and a
// single user rarely edits the same session on two devices simultaneously.
//
// Deletes: a deleted session becomes a tombstone doc ({ id, deleted, updatedAt })
// instead of disappearing, so the delete takes part in last-write-wins like any
// other edit and can't be resurrected by a device that still holds a copy.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { z } from 'zod'
import { db } from './firebase'
import { sessionSchema } from '../domain/schema'
import type { Session } from '../domain/types'

/** A Session plus the sync bookkeeping field. */
const syncedSessionSchema = sessionSchema.and(z.object({ updatedAt: z.number() }))
export type SyncedSession = z.infer<typeof syncedSessionSchema>

const tombstoneSchema = z.object({ id: z.string(), deleted: z.literal(true), updatedAt: z.number() })

/** Session id → when it was deleted (ms). */
export type Tombstones = Record<string, number>

export interface CloudState {
  sessions: SyncedSession[]
  tombstones: Tombstones
}

function sessionsCol(uid: string) {
  return collection(db, 'users', uid, 'sessions')
}

/** Reads all cloud sessions and tombstones for a user, dropping any doc that fails validation. */
export async function fetchCloudState(uid: string): Promise<CloudState> {
  const snap = await getDocs(sessionsCol(uid))
  const state: CloudState = { sessions: [], tombstones: {} }
  for (const d of snap.docs) {
    const data = d.data()
    if (data.deleted === true) {
      const parsed = tombstoneSchema.safeParse(data)
      if (parsed.success) state.tombstones[parsed.data.id] = parsed.data.updatedAt
      continue
    }
    const parsed = syncedSessionSchema.safeParse(data)
    if (parsed.success) state.sessions.push(parsed.data)
  }
  return state
}

/** Pushes a single session up, stamping updatedAt. */
export async function pushSession(uid: string, session: Session, updatedAt = Date.now()): Promise<void> {
  const payload: SyncedSession = { ...session, updatedAt }
  await setDoc(doc(sessionsCol(uid), session.id), payload)
}

/** Pushes many sessions in a batched write (Firestore caps batches at 500). */
export async function pushSessions(uid: string, sessions: Session[], updatedAt = Date.now()): Promise<void> {
  for (let i = 0; i < sessions.length; i += 450) {
    const batch = writeBatch(db)
    for (const session of sessions.slice(i, i + 450)) {
      batch.set(doc(sessionsCol(uid), session.id), { ...session, updatedAt })
    }
    await batch.commit()
  }
}

/** Writes tombstones for deleted sessions (replacing the session docs). */
export async function pushTombstones(uid: string, tombstones: Tombstones): Promise<void> {
  const entries = Object.entries(tombstones)
  for (let i = 0; i < entries.length; i += 450) {
    const batch = writeBatch(db)
    for (const [id, updatedAt] of entries.slice(i, i + 450)) {
      batch.set(doc(sessionsCol(uid), id), { id, deleted: true, updatedAt })
    }
    await batch.commit()
  }
}

export interface MergeResult {
  /** The reconciled set the local store should adopt. */
  merged: Session[]
  /** Sessions that need pushing up (the local copy won). */
  toPush: Session[]
  /** Every winning tombstone — the local store should remember them all. */
  tombstones: Tombstones
  /** Tombstones that need pushing up (the local delete won). */
  toDelete: Tombstones
}

type Candidate =
  | { kind: 'session'; session: Session; stamp: number; fromCloud: boolean }
  | { kind: 'tombstone'; stamp: number; fromCloud: boolean }

/**
 * Merges local + cloud state by session id using last-write-wins on stamps.
 * Local sessions carry no updatedAt, so their stamps come in via
 * `localStamps`; an unstamped one is treated as oldest. A tombstone beats a
 * session with the same stamp.
 */
export function mergeSessions(
  local: Session[],
  cloud: CloudState,
  localStamps: Record<string, number>,
  localTombstones: Tombstones = {},
): MergeResult {
  const byId = new Map<string, Candidate>()

  function offer(id: string, candidate: Candidate) {
    const existing = byId.get(id)
    const wins =
      !existing ||
      candidate.stamp > existing.stamp ||
      (candidate.stamp === existing.stamp && candidate.kind === 'tombstone' && existing.kind === 'session')
    if (wins) byId.set(id, candidate)
  }

  for (const s of cloud.sessions) {
    offer(s.id, { kind: 'session', session: stripStamp(s), stamp: s.updatedAt, fromCloud: true })
  }
  for (const [id, stamp] of Object.entries(cloud.tombstones)) {
    offer(id, { kind: 'tombstone', stamp, fromCloud: true })
  }
  for (const s of local) {
    offer(s.id, { kind: 'session', session: s, stamp: localStamps[s.id] ?? 0, fromCloud: false })
  }
  for (const [id, stamp] of Object.entries(localTombstones)) {
    offer(id, { kind: 'tombstone', stamp, fromCloud: false })
  }

  const result: MergeResult = { merged: [], toPush: [], tombstones: {}, toDelete: {} }
  for (const [id, winner] of byId) {
    if (winner.kind === 'session') {
      result.merged.push(winner.session)
      if (!winner.fromCloud) result.toPush.push(winner.session)
    } else {
      result.tombstones[id] = winner.stamp
      if (!winner.fromCloud) result.toDelete[id] = winner.stamp
    }
  }
  return result
}

function stripStamp(s: SyncedSession): Session {
  const rest = { ...s } as Partial<SyncedSession>
  delete rest.updatedAt
  return rest as Session
}

/** Reads the billing entitlement flag from users/{uid}. */
export async function fetchEntitlement(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() && snap.data()?.cloudSync === true
}
