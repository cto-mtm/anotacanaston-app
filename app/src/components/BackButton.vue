<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ChevronLeftIcon from './icons/ChevronLeftIcon.vue'

defineProps<{ to: string }>()
const { t } = useI18n()
</script>

<template>
  <RouterLink
    :to="to"
    class="mb-2 -ml-2 flex h-11 w-11 items-center justify-center rounded-xl text-clay transition-colors hover:bg-linen hover:text-walnut"
    :aria-label="t('common.back')"
  >
    <ChevronLeftIcon class="h-6 w-6" />
  </RouterLink>
</template>
