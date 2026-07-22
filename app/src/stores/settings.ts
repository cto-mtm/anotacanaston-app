import { defineStore } from 'pinia'
import { ref } from 'vue'
import { z } from 'zod'
import { SUPPORTED_LOCALES, type SupportedLocale } from '../i18n'

export const useSettingsStore = defineStore(
  'settings',
  () => {
    const locale = ref<SupportedLocale>('es')
    const lastOpenSessionId = ref<string | null>(null)

    function setLocale(next: SupportedLocale) {
      locale.value = next
    }

    function setLastOpenSession(sessionId: string | null) {
      lastOpenSessionId.value = sessionId
    }

    return { locale, lastOpenSessionId, setLocale, setLastOpenSession }
  },
  {
    persist: {
      version: 1,
      schema: z.object({
        locale: z.enum(SUPPORTED_LOCALES),
        lastOpenSessionId: z.string().nullable(),
      }),
    },
  },
)
