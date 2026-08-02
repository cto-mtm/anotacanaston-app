<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SUPPORTED_LOCALES } from '../i18n'
import { useSettingsStore } from '../stores/settings'

const { locale } = useI18n()
const settings = useSettingsStore()

function toggle() {
  const idx = SUPPORTED_LOCALES.indexOf(locale.value as (typeof SUPPORTED_LOCALES)[number])
  const next = SUPPORTED_LOCALES[(idx + 1) % SUPPORTED_LOCALES.length]
  locale.value = next
  settings.setLocale(next)
}
</script>

<template>
  <button
    type="button"
    class="min-h-11 min-w-11 rounded-xl border border-rose/40 bg-linen px-3 text-sm font-semibold uppercase text-clay transition-colors hover:bg-rose/30"
    @click="toggle"
  >
    {{ locale }}
  </button>
</template>
