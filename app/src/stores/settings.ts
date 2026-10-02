import { defineStore } from 'pinia'
import { ref } from 'vue'
import { z } from 'zod'
import { SUPPORTED_LOCALES, type SupportedLocale } from '../i18n'
import { cloneRules, DEFAULT_RULES } from '../domain/rules'
import { houseRulesSchema } from '../domain/schema'
import type { HouseRules } from '../domain/types'

export const useSettingsStore = defineStore(
  'settings',
  () => {
    const locale = ref<SupportedLocale>('es')
    const lastOpenSessionId = ref<string | null>(null)
    // The group's house rules, snapshotted into every NEW session. Existing
    // sessions keep the rules they were created with.
    const houseRules = ref<HouseRules>(cloneRules(DEFAULT_RULES))

    function setLocale(next: SupportedLocale) {
      locale.value = next
    }

    function setLastOpenSession(sessionId: string | null) {
      lastOpenSessionId.value = sessionId
    }

    function setHouseRules(next: HouseRules) {
      houseRules.value = cloneRules(next)
    }

    function resetHouseRules() {
      houseRules.value = cloneRules(DEFAULT_RULES)
    }

    return { locale, lastOpenSessionId, houseRules, setLocale, setLastOpenSession, setHouseRules, resetHouseRules }
  },
  {
    persist: {
      version: 1,
      schema: z.object({
        locale: z.enum(SUPPORTED_LOCALES),
        lastOpenSessionId: z.string().nullable(),
        houseRules: houseRulesSchema,
      }),
    },
  },
)
