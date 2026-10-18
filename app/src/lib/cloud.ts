// Pure helpers for moving sessions between the local backend (Pinia +
// localStorage) and the cloud backend (Firestore + offline cache). No Firebase
// imports here — the I/O lives in cloudBackend.ts — so these are unit-testable.
// See docs/plans/membership-and-storage.md.

import { sessionSchema } from '../domain/schema'
import type { Session } from '../domain/types'

/**
 * Validates a Firestore session doc. The doc carries an extra `updatedAt`
 * (server timestamp) that the schema strips; malformed docs return null.
 */
export function parseSessionDoc(data: unknown): Session | null {
  const parsed = sessionSchema.safeParse(data)
  if (parsed.success) return parsed.data
  // Skipped rather than crashing the list, but never silently.
  console.warn('Skipping invalid session document', parsed.error.issues)
  return null
}

/**
 * `incoming` sessions replace `base` sessions with the same id (keeping their
 * position); new ones are appended. Used for the explicit one-time copies
 * (offline → cloud upload, cloud → device copy-down), which are idempotent.
 */
export function mergeById(base: Session[], incoming: Session[]): Session[] {
  const byId = new Map(incoming.map((s) => [s.id, s]))
  const merged = base.map((s) => byId.get(s.id) ?? s)
  const known = new Set(base.map((s) => s.id))
  for (const s of incoming) if (!known.has(s.id)) merged.push(s)
  return merged
}

/**
 * A plain, deep copy of a session — strips Vue reactivity before handing data
 * to Firestore or copying it between the store's slots.
 */
export function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
