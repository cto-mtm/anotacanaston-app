import type { PiniaPluginContext } from 'pinia'
import type { ZodType } from 'zod'

const APP_PREFIX = 'anotacanaston'
const DEBOUNCE_MS = 300

export interface PersistOptions<T = unknown> {
  version: number
  schema: ZodType<T>
  /** Upgrades data written by an older schema version to the current shape. */
  migrate?: (raw: unknown, fromVersion: number) => T
  /**
   * Persist only these state keys (default: the whole state). Keeps in-memory
   * state — e.g. a member's cloud sessions — out of localStorage.
   */
  pick?: string[]
  /**
   * Called when the stored data fails validation as a whole: return the parts
   * that are still valid (e.g. every session but the broken one) instead of
   * starting empty. The full original is still backed up to the `.corrupt` key.
   */
  salvage?: (data: unknown) => T | undefined
}

// Deliberately not tied to S/Store — Pinia's setup-store generics resolve S
// to something other than the plain unwrapped state, so pinning persist's
// schema type to it produces bogus assignability errors. The schema's shape
// is therefore not compile-time checked against the store's state; runtime
// validation on hydrate is what actually protects against drift (writes come
// from the store's own typed actions and aren't re-validated).
declare module 'pinia' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S/Store must match Pinia's declaration to merge into it
  export interface DefineStoreOptionsBase<S, Store> {
    persist?: PersistOptions
  }
}

function storageKey(storeId: string, version: number): string {
  return `${APP_PREFIX}.${storeId}.v${version}`
}

// Pending debounced writes, flushed when the page is hidden or closed — a
// mobile OS may kill a backgrounded app before the debounce fires.
const pendingFlushes = new Set<() => void>()
let flushListenersAdded = false

/** Writes every pending debounced save now. */
export function flushPersistence() {
  for (const flush of [...pendingFlushes]) flush()
}

function addFlushListeners() {
  if (flushListenersAdded || typeof window === 'undefined') return
  flushListenersAdded = true
  window.addEventListener('pagehide', flushPersistence)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPersistence()
  })
}

/**
 * Generic persistence plugin: on store init, reads localStorage, validates
 * with zod, and hydrates the store — corrupt or invalid data is backed up
 * to a `.corrupt` key instead of crashing the app. Writes are debounced, and
 * flushed right away when the page is hidden.
 */
export function createPersistencePlugin() {
  addFlushListeners()
  return ({ store, options }: PiniaPluginContext) => {
    const persist = options.persist
    if (!persist) return

    const key = storageKey(store.$id, persist.version)

    /** Validates (after `transform`) and hydrates; invalid data is backed up, never lost. */
    function hydrate(sourceKey: string, raw: string, transform: (data: unknown) => unknown): unknown {
      let data: unknown
      try {
        data = transform(JSON.parse(raw))
        const result = persist!.schema.safeParse(data)
        if (result.success) {
          // Pinia's $patch generics don't line up with a generic plugin's
          // erased state type — this cast is the intentional boundary.
          store.$patch(result.data as never)
          return result.data
        }
      } catch {
        // fall through to the backup below
      }
      localStorage.setItem(`${sourceKey}.corrupt`, raw)
      const salvaged = data === undefined ? undefined : persist!.salvage?.(data)
      if (salvaged !== undefined) {
        store.$patch(salvaged as never)
        return salvaged
      }
      localStorage.removeItem(sourceKey)
      return undefined
    }

    const raw = localStorage.getItem(key)
    if (raw !== null) {
      hydrate(key, raw, (data) => data)
    } else if (persist.migrate) {
      // Nothing at the current version: upgrade the newest older version, if any.
      for (let version = persist.version - 1; version >= 1; version--) {
        const oldKey = storageKey(store.$id, version)
        const oldRaw = localStorage.getItem(oldKey)
        if (oldRaw === null) continue
        const migrated = hydrate(oldKey, oldRaw, (data) => persist.migrate!(data, version))
        if (migrated !== undefined) {
          // Saved under the new key right away — not on the next mutation —
          // so dropping the old key can't lose anything.
          localStorage.setItem(key, JSON.stringify(migrated))
          localStorage.removeItem(oldKey)
        }
        break
      }
    }

    const pick = persist.pick
    let timeout: ReturnType<typeof setTimeout> | undefined
    let lastWritten = localStorage.getItem(key)

    function write() {
      if (timeout) clearTimeout(timeout)
      timeout = undefined
      pendingFlushes.delete(write)
      const state = store.$state as Record<string, unknown>
      const data = pick ? Object.fromEntries(pick.map((k) => [k, state[k]])) : state
      const json = JSON.stringify(data)
      // Unpicked state (e.g. a member's cloud sessions) also triggers $subscribe;
      // skip the write when the persisted slice didn't actually change.
      if (json === lastWritten) return
      localStorage.setItem(key, json)
      lastWritten = json
    }

    // flush: 'sync' — queue the save the moment state changes (Pinia's default
    // defers to the next tick), so a flush on page hide never misses it.
    store.$subscribe(
      () => {
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(write, DEBOUNCE_MS)
        pendingFlushes.add(write)
      },
      { flush: 'sync' },
    )
  }
}
