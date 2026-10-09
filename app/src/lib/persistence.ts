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
}

// Deliberately not tied to S/Store — Pinia's setup-store generics resolve S
// to something other than the plain unwrapped state, so pinning persist's
// schema type to it produces bogus assignability errors. The schema's shape
// is therefore not compile-time checked against the store's state; runtime
// validation on hydrate/write is what actually protects against drift.
declare module 'pinia' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S/Store must match Pinia's declaration to merge into it
  export interface DefineStoreOptionsBase<S, Store> {
    persist?: PersistOptions
  }
}

function storageKey(storeId: string, version: number): string {
  return `${APP_PREFIX}.${storeId}.v${version}`
}

/**
 * Generic persistence plugin: on store init, reads localStorage, validates
 * with zod, and hydrates the store — corrupt or invalid data is backed up
 * to a `.corrupt` key instead of crashing the app. Writes are debounced.
 */
export function createPersistencePlugin() {
  return ({ store, options }: PiniaPluginContext) => {
    const persist = options.persist
    if (!persist) return

    const key = storageKey(store.$id, persist.version)

    /** Validates (after `transform`) and hydrates; invalid data is backed up, never lost. */
    function hydrate(sourceKey: string, raw: string, transform: (data: unknown) => unknown): unknown {
      try {
        const result = persist!.schema.safeParse(transform(JSON.parse(raw)))
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
    store.$subscribe((_mutation, state) => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        const data = pick
          ? Object.fromEntries(pick.map((k) => [k, (state as Record<string, unknown>)[k]]))
          : state
        localStorage.setItem(key, JSON.stringify(data))
      }, DEBOUNCE_MS)
    })
  }
}
