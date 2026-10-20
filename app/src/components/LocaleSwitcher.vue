<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SUPPORTED_LOCALES, type SupportedLocale } from '../i18n'
import { useSettingsStore } from '../stores/settings'

const { t, locale } = useI18n()
const settings = useSettingsStore()

function choose(next: SupportedLocale) {
  locale.value = next
  settings.setLocale(next)
}
</script>

<template>
  <div
    class="inline-flex rounded-xl border border-rose/40 bg-linen p-1"
    role="radiogroup"
    :aria-label="t('settings.languageTitle')"
  >
    <button
      v-for="code in SUPPORTED_LOCALES"
      :key="code"
      type="button"
      role="radio"
      :aria-checked="locale === code"
      :lang="code"
      class="min-h-11 rounded-lg px-4 text-sm font-medium transition-colors"
      :class="locale === code ? 'bg-wine text-white shadow-sm' : 'text-clay hover:text-walnut'"
      @click="choose(code)"
    >
      {{ t(`settings.languageNames.${code}`) }}
    </button>
  </div>
</template>
