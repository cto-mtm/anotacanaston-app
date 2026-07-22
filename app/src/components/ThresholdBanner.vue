<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  team: 'A' | 'B'
  threshold: { points: number; cleanOnly: boolean }
}>()
const { t } = useI18n()
</script>

<template>
  <div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
    <p class="font-medium text-amber-800">
      {{ t('gameScreen.meldThreshold') }} — {{ t(`game.team.${team}`) }}: {{ threshold.points }}
    </p>
    <p
      v-if="threshold.cleanOnly"
      class="mt-1 text-amber-700"
    >
      {{ t('gameScreen.cleanOnlyNote') }}
    </p>
    <RouterLink
      to="/rules"
      class="mt-1 inline-block text-xs text-amber-700 underline"
    >
      {{ t('shell.navRules') }}
    </RouterLink>
  </div>
</template>
