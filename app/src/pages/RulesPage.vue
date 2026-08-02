<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ALL_CANASTA_TYPES,
  CANASTA_VALUES,
  MELD_THRESHOLDS,
  MELD_THRESHOLD_DEFAULT,
} from '../domain/constants'
import { honorsValueForKind } from '../domain/scoring'

const { t, n } = useI18n()

const thresholdRows = computed(() => {
  const rows: Array<{ range: string; points: number; cleanOnly: boolean }> = []
  MELD_THRESHOLDS.forEach((bracket, i) => {
    const prevMax = i === 0 ? null : MELD_THRESHOLDS[i - 1].max
    const range = prevMax === null ? `≤ ${n(bracket.max)}` : `${n(prevMax + 5)} – ${n(bracket.max)}`
    rows.push({ range, points: bracket.points, cleanOnly: Boolean(bracket.cleanOnly) })
  })
  const lastMax = MELD_THRESHOLDS[MELD_THRESHOLDS.length - 1].max
  rows.push({ range: `> ${n(lastMax)}`, points: MELD_THRESHOLD_DEFAULT, cleanOnly: false })
  return rows
})

const HONORS_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8]
const honorsRows = computed(() =>
  HONORS_COUNTS.map((count) => ({
    count,
    both: honorsValueForKind(count, 'both'),
    cleanOnly: honorsValueForKind(count, 'cleanOnly'),
    other: honorsValueForKind(count, 'other'),
  })),
)

const CARD_POINT_ROWS = [
  { labelKey: 'rules.cardJoker', points: 50 },
  { labelKey: 'rules.cardAceOrDeuce', points: 20 },
  { labelKey: 'rules.card8ToK', points: 10 },
  { labelKey: 'rules.card3To7', points: 5 },
  { labelKey: 'rules.cardBlackThree', points: 5 },
]
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-8">
    <h1 class="font-display text-2xl text-walnut">
      {{ t('rules.title') }}
    </h1>

    <section>
      <h2 class="mb-3 font-display text-lg text-walnut">
        {{ t('rules.thresholdsTitle') }}
      </h2>
      <div class="overflow-hidden rounded-xl border border-rose/40 bg-linen">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-rose/30 text-left text-clay">
              <th class="px-4 py-2.5">
                {{ t('rules.thresholdsCumulative') }}
              </th>
              <th class="px-4 py-2.5">
                {{ t('rules.thresholdsMinimum') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in thresholdRows"
              :key="row.range"
              class="border-t border-rose/20"
            >
              <td class="px-4 py-2.5 text-walnut">
                {{ row.range }}
              </td>
              <td class="px-4 py-2.5 tabular-nums text-walnut">
                {{ row.points }}
                <span
                  v-if="row.cleanOnly"
                  class="text-xs font-medium text-gold"
                >({{ t('rules.cleanOnlyNote') }})</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h2 class="mb-3 font-display text-lg text-walnut">
        {{ t('rules.honorsTitle') }}
      </h2>
      <div class="overflow-hidden rounded-xl border border-rose/40 bg-linen">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-rose/30 text-left text-clay">
              <th class="px-4 py-2.5">
                {{ t('game.honors') }}
              </th>
              <th class="px-4 py-2.5">
                {{ t('rules.honorsBothClosed') }}
              </th>
              <th class="px-4 py-2.5">
                {{ t('rules.honorsCleanOnly') }}
              </th>
              <th class="px-4 py-2.5">
                {{ t('rules.honorsDirtyOrNone') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in honorsRows"
              :key="row.count"
              class="border-t border-rose/20"
            >
              <td class="px-4 py-2.5 text-walnut">
                {{ row.count }}
              </td>
              <td class="px-4 py-2.5 tabular-nums text-walnut">
                {{ row.both }}
              </td>
              <td class="px-4 py-2.5 tabular-nums text-walnut">
                {{ row.cleanOnly }}
              </td>
              <td class="px-4 py-2.5 tabular-nums text-walnut">
                {{ row.other }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h2 class="mb-3 font-display text-lg text-walnut">
        {{ t('rules.canastaValuesTitle') }}
      </h2>
      <div class="overflow-hidden rounded-xl border border-rose/40 bg-linen">
        <table class="w-full text-sm">
          <tbody>
            <tr
              v-for="type in ALL_CANASTA_TYPES"
              :key="type"
              class="border-t border-rose/20 first:border-t-0"
            >
              <td class="px-4 py-2.5 text-walnut">
                {{ t(`game.canastaType.${type}`) }}
              </td>
              <td class="px-4 py-2.5 text-right tabular-nums text-walnut">
                {{ CANASTA_VALUES[type] }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mt-3 text-sm text-clay">
        {{ t('rules.canastonBody') }}
      </p>
      <p class="text-sm text-clay">
        {{ t('rules.superCanastonBody') }}
      </p>
    </section>

    <section>
      <h2 class="mb-3 font-display text-lg text-walnut">
        {{ t('rules.cardPointsTitle') }}
      </h2>
      <div class="overflow-hidden rounded-xl border border-rose/40 bg-linen">
        <table class="w-full text-sm">
          <tbody>
            <tr
              v-for="row in CARD_POINT_ROWS"
              :key="row.labelKey"
              class="border-t border-rose/20 first:border-t-0"
            >
              <td class="px-4 py-2.5 text-walnut">
                {{ t(row.labelKey) }}
              </td>
              <td class="px-4 py-2.5 text-right tabular-nums text-walnut">
                {{ row.points }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h2 class="mb-1 font-display text-lg text-walnut">
        {{ t('rules.goingOutTitle') }}
      </h2>
      <p class="text-sm text-clay">
        {{ t('rules.goingOutBody') }}
      </p>
    </section>

    <section>
      <h2 class="mb-1 font-display text-lg text-walnut">
        {{ t('rules.blackThreesTitle') }}
      </h2>
      <p class="text-sm text-clay">
        {{ t('rules.blackThreesBody') }}
      </p>
    </section>

    <section>
      <h2 class="mb-1 font-display text-lg text-walnut">
        {{ t('rules.pilonTriadoTitle') }}
      </h2>
      <p class="text-sm text-clay">
        {{ t('rules.pilonTriadoBody') }}
      </p>
    </section>
  </div>
</template>
