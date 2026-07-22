<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { RoundScoreBreakdown } from '../domain/scoring'

defineProps<{ breakdown: RoundScoreBreakdown; teamLabel: string }>()
const { t } = useI18n()

const LINES: Array<{ key: keyof RoundScoreBreakdown; labelKey: string }> = [
  { key: 'cut', labelKey: 'game.exactCut' },
  { key: 'misdeal', labelKey: 'game.misdeal' },
  { key: 'honors', labelKey: 'game.honors' },
  { key: 'canastas', labelKey: 'game.canastas' },
  { key: 'countBonus', labelKey: 'game.countBonus' },
  { key: 'goingOut', labelKey: 'game.goingOut' },
  { key: 'melded', labelKey: 'game.meldedPoints' },
  { key: 'hand', labelKey: 'game.handPoints' },
]
</script>

<template>
  <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
    <p class="mb-2 font-medium text-neutral-700">
      {{ teamLabel }} — {{ t('roundEntry.preview') }}
    </p>
    <dl class="space-y-1">
      <div
        v-for="line in LINES"
        :key="line.key"
        class="flex justify-between"
      >
        <dt class="text-neutral-500">
          {{ t(line.labelKey) }}
        </dt>
        <dd
          class="tabular-nums"
          :class="Number(breakdown[line.key]) < 0 ? 'text-red-600' : 'text-neutral-800'"
        >
          {{ breakdown[line.key] }}
        </dd>
      </div>
      <div class="flex justify-between border-t border-neutral-200 pt-1 font-semibold">
        <dt>{{ t('common.total') }}</dt>
        <dd class="tabular-nums">
          {{ breakdown.total }}
        </dd>
      </div>
    </dl>
  </div>
</template>
