<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SUPPORTED_LOCALES } from '../i18n'

const { locale } = useI18n()

function toggle() {
  const idx = SUPPORTED_LOCALES.indexOf(locale.value as (typeof SUPPORTED_LOCALES)[number])
  locale.value = SUPPORTED_LOCALES[(idx + 1) % SUPPORTED_LOCALES.length]
}
</script>

<template>
  <button
    type="button"
    class="rounded border border-neutral-300 px-2 py-1 text-xs font-medium uppercase text-neutral-600 hover:bg-neutral-100"
    @click="toggle"
  >
    {{ locale }}
  </button>
</template>
