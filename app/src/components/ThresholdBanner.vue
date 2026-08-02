<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  team: 'A' | 'B'
  threshold: { points: number; cleanOnly: boolean }
}>()
const { t } = useI18n()
</script>

<template>
  <div class="rounded-xl border border-gold/30 bg-gold-light p-3 text-sm">
    <p class="font-semibold text-gold">
      {{ t('gameScreen.meldThreshold') }} — {{ t(`game.team.${team}`) }}: {{ threshold.points }}
    </p>
    <p
      v-if="threshold.cleanOnly"
      class="mt-1 text-clay"
    >
      {{ t('gameScreen.cleanOnlyNote') }}
    </p>
    <RouterLink
      to="/rules"
      class="mt-1 inline-block text-xs text-gold underline transition-colors hover:text-walnut"
    >
      {{ t('shell.navRules') }}
    </RouterLink>
  </div>
</template>
