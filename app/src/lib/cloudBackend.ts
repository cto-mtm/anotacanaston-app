// The cloud storage backend for Club members: Firestore with its persistent
// offline cache does the syncing (offline reads, queued writes, live updates
// across devices and tabs, server-ordered writes). This module is only thin
// I/O; deciding WHEN to use it lives in lib/sync.ts.
//
// Data model (security rules in firebase/firestore.rules):
//   users/{uid}                        — membership doc, written only by the Stripe webhook
//   users/{uid}/sessions/{sessionId}   — one doc per Session (+ server `updatedAt`)
//   users/{uid}/settings/houseRules    — { rules, updatedAt }

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import { parseSessionDoc, toPlain } from './cloud'
import { houseRulesSchema } from '../domain/schema'
import { userDocSchema, type UserDoc } from '../domain/membership'
import type { HouseRules, Session } from '../domain/types'

const sessionsCol = (uid: string) => collection(db(), 'users', uid, 'sessions')
const userDocRef = (uid: string) => doc(db(), 'users', uid)
const houseRulesRef = (uid: string) => doc(db(), 'users', uid, 'settings', 'houseRules')

export interface SessionsSnapshot {
  sessions: Session[]
  /** Local writes not yet confirmed by the server ("Guardando…"). */
  hasPendingWrites: boolean
  /** Served from the offline cache (possibly offline). */
  fromCache: boolean
}

/** Live list of the member's sessions — fires immediately from the cache. */
export function watchSessions(
  uid: string,
  onData: (snapshot: SessionsSnapshot) => void,
  onError: (err: unknown) => void,
): () => void {
  return onSnapshot(
    sessionsCol(uid),
    { includeMetadataChanges: true },
    (snap) => {
      const sessions: Session[] = []
      for (const d of snap.docs) {
        const session = parseSessionDoc(d.data())
        if (session) sessions.push(session)
      }
      onData({ sessions, hasPendingWrites: snap.metadata.hasPendingWrites, fromCache: snap.metadata.fromCache })
    },
    onError,
  )
}

/**
 * Writes a session (already a plain copy — the sessions store hands one over).
 * Resolves when the server confirms, but the offline cache (and so the live
 * listener) has it immediately — callers must not await this for UI responsiveness.
 */
export function saveSession(uid: string, session: Session): Promise<void> {
  return setDoc(doc(sessionsCol(uid), session.id), { ...session, updatedAt: serverTimestamp() })
}

export function removeSession(uid: string, sessionId: string): Promise<void> {
  return deleteDoc(doc(sessionsCol(uid), sessionId))
}

/**
 * One-time bulk upload (offline games → cloud) of plain session copies.
 * Idempotent by session id. Every batch is committed at once — the cache
 * applies them immediately — and this resolves when the server has them all.
 */
export async function uploadSessions(uid: string, sessions: Session[]): Promise<void> {
  const commits: Promise<void>[] = []
  for (let i = 0; i < sessions.length; i += 450) {
    const batch = writeBatch(db())
    for (const session of sessions.slice(i, i + 450)) {
      batch.set(doc(sessionsCol(uid), session.id), { ...session, updatedAt: serverTimestamp() })
    }
    commits.push(batch.commit())
  }
  await Promise.all(commits)
}

/** One-time read of every session (copy-down when a subscription lapses — reads stay allowed). */
export async function fetchSessions(uid: string): Promise<Session[]> {
  const snap = await getDocs(sessionsCol(uid))
  return snap.docs.map((d) => parseSessionDoc(d.data())).filter((s): s is Session => s !== null)
}

/** Live membership doc. `null` when it doesn't exist (never subscribed). */
export function watchUserDoc(
  uid: string,
  onData: (doc: UserDoc | null) => void,
  onError: (err: unknown) => void,
): () => void {
  return onSnapshot(
    userDocRef(uid),
    (snap) => {
      if (!snap.exists()) return onData(null)
      const parsed = userDocSchema.safeParse(snap.data())
      onData(parsed.success ? parsed.data : null)
    },
    onError,
  )
}

/**
 * Live house rules for members. `rules` is null when the doc is missing or
 * unreadable — `exists` tells the two apart. Only trust "missing" when
 * `fromCache` is false (an offline cache may simply not have the doc yet).
 */
export function watchHouseRules(
  uid: string,
  onData: (rules: HouseRules | null, meta: { exists: boolean; fromCache: boolean }) => void,
  onError: (err: unknown) => void,
): () => void {
  return onSnapshot(
    houseRulesRef(uid),
    (snap) => {
      const parsed = houseRulesSchema.safeParse(snap.data()?.rules)
      onData(snap.exists() && parsed.success ? parsed.data : null, {
        exists: snap.exists(),
        fromCache: snap.metadata.fromCache,
      })
    },
    onError,
  )
}

export function saveHouseRules(uid: string, rules: HouseRules): Promise<void> {
  return setDoc(houseRulesRef(uid), { rules: toPlain(rules), updatedAt: serverTimestamp() })
}
