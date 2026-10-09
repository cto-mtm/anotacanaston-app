import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, ref } from 'vue'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import { z } from 'zod'
import { createPersistencePlugin } from './persistence'
import { DEFAULT_RULES } from '../domain/rules'

/** Minimal in-memory localStorage (the test environment is plain node). */
function fakeStorage() {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

let storage: ReturnType<typeof fakeStorage>

beforeEach(() => {
  storage = fakeStorage()
  vi.stubGlobal('localStorage', storage)
  vi.useFakeTimers()
  // Plugins only run for a pinia installed in an app.
  const pinia = createPinia().use(createPersistencePlugin())
  createApp({}).use(pinia)
  setActivePinia(pinia)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const schema = z.object({ items: z.array(z.string()) })

/** A v2 store whose v1 kept the list under `list`. */
function useV2Store() {
  return defineStore(
    'test',
    () => {
      const items = ref<string[]>([])
      const scratch = ref('not persisted')
      return { items, scratch }
    },
    {
      persist: {
        version: 2,
        schema,
        pick: ['items'],
        migrate: (raw) => ({ items: (raw as { list?: string[] }).list ?? [] }),
      },
    },
  )()
}

describe('persistence plugin', () => {
  it('hydrates valid data at the current version', () => {
    storage.setItem('anotacanaston.test.v2', JSON.stringify({ items: ['a'] }))
    expect(useV2Store().items).toEqual(['a'])
  })

  it('backs up invalid data instead of crashing, and starts empty', () => {
    storage.setItem('anotacanaston.test.v2', JSON.stringify({ items: 'nope' }))
    expect(useV2Store().items).toEqual([])
    expect(storage.getItem('anotacanaston.test.v2.corrupt')).toBe(JSON.stringify({ items: 'nope' }))
    expect(storage.getItem('anotacanaston.test.v2')).toBeNull()
  })

  it('upgrades an older version and saves it under the new key at once', () => {
    storage.setItem('anotacanaston.test.v1', JSON.stringify({ list: ['a', 'b'] }))
    const store = useV2Store()
    expect(store.items).toEqual(['a', 'b'])
    // Written immediately — not on the next mutation — and the old key dropped.
    expect(JSON.parse(storage.getItem('anotacanaston.test.v2')!)).toEqual({ items: ['a', 'b'] })
    expect(storage.getItem('anotacanaston.test.v1')).toBeNull()
  })

  it('prefers the current version over an older one', () => {
    storage.setItem('anotacanaston.test.v1', JSON.stringify({ list: ['old'] }))
    storage.setItem('anotacanaston.test.v2', JSON.stringify({ items: ['new'] }))
    expect(useV2Store().items).toEqual(['new'])
  })

  it('backs up an older version that fails to migrate, keeping the data', () => {
    storage.setItem('anotacanaston.test.v1', JSON.stringify({ list: [42] }))
    expect(useV2Store().items).toEqual([])
    expect(storage.getItem('anotacanaston.test.v1.corrupt')).toBe(JSON.stringify({ list: [42] }))
    expect(storage.getItem('anotacanaston.test.v2')).toBeNull()
  })

  it('upgrades the real sessions store from the v1 shape', async () => {
    // Saved before `createdAt` existed.
    const oldSession = {
      id: 's1',
      date: '2026-01-01',
      playerCount: 4,
      players: [{ id: 'p1', name: 'Ana' }],
      manoId: 'p1',
      initialDealerId: 'p1',
      plannedGames: 1,
      rules: DEFAULT_RULES,
      games: [],
      status: 'in_progress',
    }
    storage.setItem(
      'anotacanaston.sessions.v1',
      JSON.stringify({ sessions: [oldSession], sessionStamps: { s1: 1 }, deletedStamps: {} }),
    )
    const { useSessionsStore } = await import('../stores/sessions')
    const store = useSessionsStore()
    expect(store.localSessions.map((s) => [s.id, s.createdAt])).toEqual([['s1', 0]])
    expect(storage.getItem('anotacanaston.sessions.v1')).toBeNull()
  })

  it('keeps the real settings saved before the Club banner fields existed', async () => {
    const rules = { ...DEFAULT_RULES, gameTarget: 20_000 }
    storage.setItem(
      'anotacanaston.settings.v1',
      JSON.stringify({ locale: 'en', lastOpenSessionId: null, houseRules: rules }),
    )
    const { useSettingsStore } = await import('../stores/settings')
    const store = useSettingsStore()
    expect(store.locale).toBe('en')
    expect(store.houseRules).toEqual(rules)
    expect(store.clubBannerDismissals).toBe(0)
  })

  it('persists only the picked keys, debounced', async () => {
    const store = useV2Store()
    store.items.push('x')
    store.scratch = 'changed'
    await vi.runAllTimersAsync()
    expect(JSON.parse(storage.getItem('anotacanaston.test.v2')!)).toEqual({ items: ['x'] })
  })
})
