<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSessionsStore } from '../stores/sessions'
import { scoreRound, validateRound, checkCardSupply } from '../domain/scoring'
import { teamsForGame } from '../domain/constants'
import { ALL_CANASTA_TYPES } from '../domain/constants'
import TeamRoundForm from '../components/TeamRoundForm.vue'
import ScorePreview from '../components/ScorePreview.vue'
import BaseButton from '../components/BaseButton.vue'
import type { CanastaType, PlayerId, TeamId, TeamRoundEntry } from '../domain/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const sessionsStore = useSessionsStore()

const sessionId = computed(() => route.params.id as string)
const gameIndex = computed(() => Number(route.params.g))
const isEdit = computed(() => route.name === 'round-edit')
const roundIndex = computed(() => Number(route.params.r))

const session = computed(() => sessionsStore.findSession(sessionId.value))
const game = computed(() => session.value?.games[gameIndex.value])
const teams = computed(() => (game.value ? teamsForGame(game.value.partnership) : (['A', 'B'] as TeamId[])))

// Mobile tab: show one team at a time on narrow screens
const activeTeam = ref<TeamId>('A')

function makeEmptyEntry(playerIds: PlayerId[]): TeamRoundEntry {
  const canastas = Object.fromEntries(ALL_CANASTA_TYPES.map((c) => [c, 0])) as Record<CanastaType, number>
  const canastasEnMano = Object.fromEntries(ALL_CANASTA_TYPES.map((c) => [c, 0])) as Record<CanastaType, number>
  const handPoints = Object.fromEntries(playerIds.map((id) => [id, 0]))
  return {
    exactCut: false,
    misdeal: false,
    honors: 0,
    canastas,
    canastasEnMano,
    wentOut: false,
    blackThreesBonus: false,
    meldedPoints: 0,
    handPoints,
  }
}

// The store's round entries are Vue reactive proxies — structuredClone
// can't clone those directly, so plain JSON round-trip both clones and
// unwraps reactivity (TeamRoundEntry is plain JSON-safe data).
function cloneEntry(entry: TeamRoundEntry): TeamRoundEntry {
  return JSON.parse(JSON.stringify(entry))
}

const existingRound = isEdit.value ? game.value?.rounds[roundIndex.value] : undefined

const entries = ref<Record<TeamId, TeamRoundEntry>>({
  A: existingRound ? cloneEntry(existingRound.entries.A) : makeEmptyEntry(game.value?.partnership.A ?? []),
  B: existingRound ? cloneEntry(existingRound.entries.B) : makeEmptyEntry(game.value?.partnership.B ?? []),
  C: existingRound ? cloneEntry(existingRound.entries.C) : makeEmptyEntry(game.value?.partnership.C ?? []),
})

const breakdowns = computed(() => {
  const result: Partial<Record<TeamId, ReturnType<typeof scoreRound>>> = {}
  for (const team of teams.value) result[team] = scoreRound(entries.value[team])
  return result as Record<TeamId, ReturnType<typeof scoreRound>>
})

const validation = computed(() =>
  validateRound({ entries: entries.value }, session.value?.playerCount ?? 4, teams.value),
)

// Non-blocking: heads-up that a canasta combination looks off given the deck in play.
const cardSupplyWarnings = computed(() =>
  checkCardSupply({ entries: entries.value }, session.value?.playerCount ?? 4, teams.value),
)

function playersFor(team: TeamId) {
  const ids = game.value?.partnership[team] ?? []
  return ids.map((id) => session.value?.players.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p))
}

function noCanastasClosed(entry: TeamRoundEntry): boolean {
  return (
    Object.values(entry.canastas).every((count) => count === 0) &&
    Object.values(entry.canastasEnMano).every((count) => count === 0)
  )
}

function persist() {
  if (isEdit.value) {
    sessionsStore.updateRound(sessionId.value, gameIndex.value, roundIndex.value, entries.value)
  } else {
    sessionsStore.addRound(sessionId.value, gameIndex.value, entries.value)
  }
  sessionsStore.advanceGame(sessionId.value)
  router.push(`/sessions/${sessionId.value}/games/${gameIndex.value}`)
}

function save() {
  if (validation.value.valid) persist()
}

const teamTabColors: Record<TeamId, { active: string; inactive: string }> = {
  A: { active: 'border-wine bg-wine text-white shadow-sm shadow-wine/20', inactive: 'border-rose/40 bg-linen text-walnut' },
  B: { active: 'border-sage bg-sage text-white shadow-sm shadow-sage/20', inactive: 'border-rose/40 bg-linen text-walnut' },
  C: { active: 'border-gold bg-gold text-white shadow-sm shadow-gold/20', inactive: 'border-rose/40 bg-linen text-walnut' },
}
</script>

<template>
  <div v-if="session && game">
    <h1 class="mb-5 font-display text-2xl text-walnut">
      {{ t(isEdit ? 'roundEntry.editTitle' : 'roundEntry.title') }}
    </h1>

    <!-- Team tabs: mobile only -->
    <div class="mb-4 flex gap-2 md:hidden">
      <button
        v-for="team in teams"
        :key="team"
        type="button"
        class="flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all active:scale-[0.97]"
        :class="activeTeam === team ? teamTabColors[team].active : teamTabColors[team].inactive"
        @click="activeTeam = team"
      >
        {{ t(`game.team.${team}`) }}
      </button>
    </div>

    <div
      class="grid grid-cols-1 gap-4"
      :class="teams.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'"
    >
      <div
        v-for="team in teams"
        :key="team"
        :class="{ hidden: activeTeam !== team, 'md:block': true }"
      >
        <TeamRoundForm
          v-model="entries[team]"
          :players="playersFor(team)"
          :team-label="t(`game.team.${team}`)"
        />
        <p
          v-if="noCanastasClosed(entries[team])"
          class="mt-2 text-sm text-gold"
        >
          {{ t('roundEntry.noCanastasWarning') }}
        </p>
        <ScorePreview
          class="mt-3"
          :breakdown="breakdowns[team]"
          :team-label="t(`game.team.${team}`)"
        />
      </div>
    </div>

    <div
      v-if="!validation.valid"
      class="mt-5 rounded-2xl border border-wine/30 bg-wine-light p-4 text-sm text-wine"
    >
      <ul class="mb-2 list-inside list-disc">
        <li
          v-for="(violation, i) in validation.violations"
          :key="i"
        >
          {{ t(`roundEntry.violations.${violation.code}`) }}
          <template v-if="violation.team">
            — {{ t(`game.team.${violation.team}`) }}
          </template>
        </li>
      </ul>
      <p class="mb-2">
        {{ t('roundEntry.overrideWarning') }}
      </p>
      <BaseButton @click="persist">
        {{ t('roundEntry.saveAnyway') }}
      </BaseButton>
    </div>

    <div
      v-if="cardSupplyWarnings.length > 0"
      class="mt-5 rounded-2xl border border-gold/30 bg-gold-light p-4 text-sm text-gold"
    >
      <p class="mb-2 font-semibold">
        {{ t('roundEntry.cardSupplyTitle') }}
      </p>
      <ul class="list-inside list-disc">
        <li
          v-for="(warning, i) in cardSupplyWarnings"
          :key="i"
        >
          {{ t(`roundEntry.cardSupplyWarnings.${warning.code}`) }}
          <template v-if="warning.team">
            — {{ t(`game.team.${warning.team}`) }}
          </template>
        </li>
      </ul>
    </div>

    <div class="mt-6">
      <BaseButton @click="save">
        {{ t('roundEntry.save') }}
      </BaseButton>
    </div>
  </div>
</template>
