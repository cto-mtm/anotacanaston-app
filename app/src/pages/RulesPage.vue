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
    <h1 class="text-2xl font-bold">
      {{ t('rules.title') }}
    </h1>

    <section>
      <h2 class="mb-2 font-semibold">
        {{ t('rules.thresholdsTitle') }}
      </h2>
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-neutral-500">
            <th class="py-1">
              {{ t('rules.thresholdsCumulative') }}
            </th>
            <th class="py-1">
              {{ t('rules.thresholdsMinimum') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in thresholdRows"
            :key="row.range"
            class="border-t border-neutral-100"
          >
            <td class="py-1">
              {{ row.range }}
            </td>
            <td class="py-1 tabular-nums">
              {{ row.points }}
              <span
                v-if="row.cleanOnly"
                class="text-xs text-amber-700"
              >({{ t('rules.cleanOnlyNote') }})</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2 class="mb-2 font-semibold">
        {{ t('rules.honorsTitle') }}
      </h2>
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-neutral-500">
            <th class="py-1">
              {{ t('game.honors') }}
            </th>
            <th class="py-1">
              {{ t('rules.honorsBothClosed') }}
            </th>
            <th class="py-1">
              {{ t('rules.honorsCleanOnly') }}
            </th>
            <th class="py-1">
              {{ t('rules.honorsDirtyOrNone') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in honorsRows"
            :key="row.count"
            class="border-t border-neutral-100"
          >
            <td class="py-1">
              {{ row.count }}
            </td>
            <td class="py-1 tabular-nums">
              {{ row.both }}
            </td>
            <td class="py-1 tabular-nums">
              {{ row.cleanOnly }}
            </td>
            <td class="py-1 tabular-nums">
              {{ row.other }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2 class="mb-2 font-semibold">
        {{ t('rules.canastaValuesTitle') }}
      </h2>
      <table class="w-full text-sm">
        <tbody>
          <tr
            v-for="type in ALL_CANASTA_TYPES"
            :key="type"
            class="border-t border-neutral-100"
          >
            <td class="py-1">
              {{ t(`game.canastaType.${type}`) }}
            </td>
            <td class="py-1 text-right tabular-nums">
              {{ CANASTA_VALUES[type] }}
            </td>
          </tr>
        </tbody>
      </table>
      <p class="mt-2 text-sm text-neutral-600">
        {{ t('rules.canastonBody') }}
      </p>
      <p class="text-sm text-neutral-600">
        {{ t('rules.superCanastonBody') }}
      </p>
    </section>

    <section>
      <h2 class="mb-2 font-semibold">
        {{ t('rules.cardPointsTitle') }}
      </h2>
      <table class="w-full text-sm">
        <tbody>
          <tr
            v-for="row in CARD_POINT_ROWS"
            :key="row.labelKey"
            class="border-t border-neutral-100"
          >
            <td class="py-1">
              {{ t(row.labelKey) }}
            </td>
            <td class="py-1 text-right tabular-nums">
              {{ row.points }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2 class="mb-1 font-semibold">
        {{ t('rules.goingOutTitle') }}
      </h2>
      <p class="text-sm text-neutral-600">
        {{ t('rules.goingOutBody') }}
      </p>
    </section>

    <section>
      <h2 class="mb-1 font-semibold">
        {{ t('rules.blackThreesTitle') }}
      </h2>
      <p class="text-sm text-neutral-600">
        {{ t('rules.blackThreesBody') }}
      </p>
    </section>

    <section>
      <h2 class="mb-1 font-semibold">
        {{ t('rules.pilonTriadoTitle') }}
      </h2>
      <p class="text-sm text-neutral-600">
        {{ t('rules.pilonTriadoBody') }}
      </p>
    </section>
  </div>
</template>
