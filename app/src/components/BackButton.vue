<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ChevronLeftIcon from './icons/ChevronLeftIcon.vue'

defineProps<{ to: string }>()
const { t } = useI18n()
</script>

<template>
  <RouterLink
    :to="to"
    class="mb-2 -ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-100"
    :aria-label="t('common.back')"
  >
    <ChevronLeftIcon class="h-6 w-6" />
  </RouterLink>
</template>
