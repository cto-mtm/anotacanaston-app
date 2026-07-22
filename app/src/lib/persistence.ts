import type { PiniaPluginContext } from 'pinia'
import type { ZodType } from 'zod'

const APP_PREFIX = 'anotacanaston'
const DEBOUNCE_MS = 300

export interface PersistOptions<T = unknown> {
  version: number
  schema: ZodType<T>
  /** Upgrades data written by an older schema version to the current shape. */
  migrate?: (raw: unknown, fromVersion: number) => T
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
    const raw = localStorage.getItem(key)

    if (raw !== null) {
      try {
        const parsed: unknown = JSON.parse(raw)
        const result = persist.schema.safeParse(parsed)
        if (result.success) {
          // Pinia's $patch generics don't line up with a generic plugin's
          // erased state type — this cast is the intentional boundary.
          store.$patch(result.data as never)
        } else {
          localStorage.setItem(`${key}.corrupt`, raw)
          localStorage.removeItem(key)
        }
      } catch {
        localStorage.setItem(`${key}.corrupt`, raw)
        localStorage.removeItem(key)
      }
    }

    let timeout: ReturnType<typeof setTimeout> | undefined
    store.$subscribe((_mutation, state) => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        localStorage.setItem(key, JSON.stringify(state))
      }, DEBOUNCE_MS)
    })
  }
}
