<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ALL_SECTIONS, useRoundLines, type RoundSectionKey } from '../../composables/useRoundLines'
import type { CardSupplyWarning, RoundScoreBreakdown, RoundValidation } from '../../domain/scoring'
import type { Player, TeamId, TeamRoundEntry } from '../../domain/types'

/** Final step: every team's non-empty lines side by side, plus warnings. */
const props = defineProps<{
  teams: TeamId[]
  entries: Record<TeamId, TeamRoundEntry>
  breakdowns: Record<TeamId, RoundScoreBreakdown>
  players: Record<TeamId, Player[]>
  /** Each team's display label — its members' names. */
  names: Record<TeamId, string>
  validation: RoundValidation
  cardSupplyWarnings: CardSupplyWarning[]
}>()
const emit = defineEmits<{ goTo: [team: TeamId, section: RoundSectionKey | null] }>()
const { t } = useI18n()
const { sectionLines, formatPoints } = useRoundLines()

function linesFor(team: TeamId) {
  const lines = sectionLines(props.entries[team], props.breakdowns[team], props.players[team])
  return ALL_SECTIONS.filter((key) => lines[key].filled || lines[key].points !== 0).map((key) => ({ key, ...lines[key] }))
}
</script>

<template>
  <div>
    <h2 class="font-display text-lg text-walnut">
      {{ t('roundEntry.reviewTitle') }}
    </h2>
    <p class="mb-3 text-xs text-clay">
      {{ t('roundEntry.reviewHint') }}
    </p>

    <div
      class="grid gap-2"
      :class="teams.length === 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-3'"
    >
      <div
        v-for="team in teams"
        :key="team"
        class="min-w-0 rounded-2xl border border-rose/40 bg-linen p-3"
      >
        <p class="mb-1 truncate text-sm font-semibold text-walnut">
          {{ names[team] }}
        </p>
        <ul class="text-sm">
          <li v-if="entries[team].wentOut">
            <button
              type="button"
              class="flex min-h-10 w-full items-center justify-between gap-2 text-left"
              @click="emit('goTo', team, null)"
            >
              <span class="truncate text-clay">{{ t('game.goingOut') }}</span>
              <span
                class="shrink-0 font-medium tabular-nums"
                :class="breakdowns[team].goingOut ? 'text-walnut' : 'text-wine'"
              >{{ formatPoints(breakdowns[team].goingOut) }}</span>
            </button>
          </li>
          <li
            v-for="line in linesFor(team)"
            :key="line.key"
          >
            <button
              type="button"
              class="flex min-h-10 w-full items-center justify-between gap-2 text-left"
              @click="emit('goTo', team, line.key)"
            >
              <span class="min-w-0">
                <span class="block truncate text-clay">{{ t(`roundEntry.sections.${line.key}`) }}</span>
                <span class="block truncate text-xs text-clay/80">{{ line.summary }}</span>
              </span>
              <span
                class="shrink-0 font-medium tabular-nums"
                :class="line.points < 0 ? 'text-wine' : 'text-walnut'"
              >{{ formatPoints(line.points) }}</span>
            </button>
          </li>
        </ul>
        <p class="mt-1 flex justify-between border-t border-rose/40 pt-1.5 font-semibold text-walnut">
          <span>{{ t('common.total') }}</span>
          <span
            class="tabular-nums"
            :class="{ 'text-wine': breakdowns[team].total < 0 }"
          >{{ formatPoints(breakdowns[team].total) }}</span>
        </p>
      </div>
    </div>

    <div
      v-if="!validation.valid"
      class="mt-3 rounded-2xl border border-wine/30 bg-wine-light p-3 text-sm text-wine"
      role="alert"
    >
      <ul class="list-inside list-disc space-y-0.5">
        <li
          v-for="(violation, i) in validation.violations"
          :key="i"
        >
          {{ t(`roundEntry.violations.${violation.code}`) }}
          <template v-if="violation.team">
            — {{ names[violation.team] }}
          </template>
        </li>
      </ul>
      <p class="mt-2 font-medium">
        {{ t('roundEntry.overrideWarning') }}
      </p>
    </div>

    <div
      v-if="cardSupplyWarnings.length > 0"
      class="mt-3 rounded-2xl border border-gold/30 bg-gold-light p-3 text-sm text-gold"
    >
      <p class="mb-1 font-semibold">
        {{ t('roundEntry.cardSupplyTitle') }}
      </p>
      <ul class="list-inside list-disc space-y-0.5">
        <li
          v-for="(warning, i) in cardSupplyWarnings"
          :key="i"
        >
          {{ t(`roundEntry.cardSupplyWarnings.${warning.code}`) }}
          <template v-if="warning.team">
            — {{ names[warning.team] }}
          </template>
        </li>
      </ul>
    </div>
  </div>
</template>
