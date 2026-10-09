import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { z } from 'zod'
import { SUPPORTED_LOCALES, type SupportedLocale } from '../i18n'
import { cloneRules, DEFAULT_RULES } from '../domain/rules'
import { houseRulesSchema } from '../domain/schema'
import type { HouseRules } from '../domain/types'

const DAY_MS = 24 * 60 * 60 * 1000
/** Snooze length per "Ahora no": 1st → 7 days, 2nd → 30 days, 3rd → hidden for good. */
const CLUB_BANNER_SNOOZE_DAYS = [7, 30]

export const useSettingsStore = defineStore(
  'settings',
  () => {
    const locale = ref<SupportedLocale>('es')
    const lastOpenSessionId = ref<string | null>(null)
    // The group's house rules, snapshotted into every NEW session. Existing
    // sessions keep the rules they were created with.
    const houseRules = ref<HouseRules>(cloneRules(DEFAULT_RULES))
    // Club members: edits also go to the cloud (injected by lib/sync.ts so
    // this store never imports Firebase), and the cloud copy flows back in
    // via adoptHouseRules.
    const houseRulesWriter = shallowRef<((rules: HouseRules) => void) | null>(null)
    // Club banner "Ahora no" state: each dismissal snoozes longer, and after
    // the last one the banner stays hidden (Club is still in Settings).
    const clubBannerDismissals = ref(0)
    const clubBannerSnoozedUntil = ref(0)
    // Date.now() isn't reactive: refresh the clock whenever the app comes back
    // to the foreground, so a snooze can expire without a restart.
    const now = ref(Date.now())
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) now.value = Date.now()
      })
    }

    const showClubBanner = computed(
      () => clubBannerDismissals.value < CLUB_BANNER_SNOOZE_DAYS.length + 1 &&
        now.value >= clubBannerSnoozedUntil.value,
    )

    function dismissClubBanner() {
      const days = CLUB_BANNER_SNOOZE_DAYS[clubBannerDismissals.value]
      clubBannerDismissals.value += 1
      // Past the last snooze step the count alone hides it; the stamp is moot.
      clubBannerSnoozedUntil.value = days === undefined ? 0 : Date.now() + days * DAY_MS
    }

    function setLocale(next: SupportedLocale) {
      locale.value = next
    }

    function setLastOpenSession(sessionId: string | null) {
      lastOpenSessionId.value = sessionId
    }

    function setHouseRules(next: HouseRules) {
      houseRules.value = cloneRules(next)
      houseRulesWriter.value?.(cloneRules(next))
    }

    function resetHouseRules() {
      setHouseRules(DEFAULT_RULES)
    }

    /** The cloud's copy of a member's house rules (from the live listener). */
    function adoptHouseRules(next: HouseRules) {
      houseRules.value = cloneRules(next)
    }

    function setHouseRulesWriter(writer: ((rules: HouseRules) => void) | null) {
      houseRulesWriter.value = writer
    }

    return {
      locale,
      lastOpenSessionId,
      houseRules,
      houseRulesWriter,
      clubBannerDismissals,
      clubBannerSnoozedUntil,
      showClubBanner,
      setLocale,
      setLastOpenSession,
      setHouseRules,
      resetHouseRules,
      adoptHouseRules,
      setHouseRulesWriter,
      dismissClubBanner,
    }
  },
  {
    persist: {
      version: 1,
      pick: ['locale', 'lastOpenSessionId', 'houseRules', 'clubBannerDismissals', 'clubBannerSnoozedUntil'],
      schema: z.object({
        locale: z.enum(SUPPORTED_LOCALES),
        lastOpenSessionId: z.string().nullable(),
        houseRules: houseRulesSchema,
        // Defaults keep settings saved before these existed (rules, locale) valid.
        clubBannerDismissals: z.number().int().min(0).default(0),
        clubBannerSnoozedUntil: z.number().default(0),
      }),
    },
  },
)
