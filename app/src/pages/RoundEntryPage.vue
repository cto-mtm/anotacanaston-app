<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSessionsStore } from '../stores/sessions'
import { scoreRound, validateRound } from '../domain/scoring'
import { ALL_CANASTA_TYPES } from '../domain/constants'
import TeamRoundForm from '../components/TeamRoundForm.vue'
import ScorePreview from '../components/ScorePreview.vue'
import BaseButton from '../components/BaseButton.vue'
import type { CanastaType, PlayerId, TeamRoundEntry } from '../domain/types'

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

function makeEmptyEntry(playerIds: PlayerId[]): TeamRoundEntry {
  const canastas = Object.fromEntries(ALL_CANASTA_TYPES.map((c) => [c, 0])) as Record<CanastaType, number>
  const handPoints = Object.fromEntries(playerIds.map((id) => [id, 0]))
  return {
    exactCut: false,
    misdeal: false,
    honors: 0,
    canastas,
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

const entriesA = ref<TeamRoundEntry>(
  existingRound ? cloneEntry(existingRound.entries.A) : makeEmptyEntry(game.value?.partnership.A ?? []),
)
const entriesB = ref<TeamRoundEntry>(
  existingRound ? cloneEntry(existingRound.entries.B) : makeEmptyEntry(game.value?.partnership.B ?? []),
)

const breakdownA = computed(() => scoreRound(entriesA.value))
const breakdownB = computed(() => scoreRound(entriesB.value))

const validation = computed(() =>
  validateRound({ entries: { A: entriesA.value, B: entriesB.value } }, session.value?.playerCount ?? 4),
)

function playersFor(team: 'A' | 'B') {
  const ids = game.value?.partnership[team] ?? []
  return ids.map((id) => session.value?.players.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p))
}

function noCanastasClosed(entry: TeamRoundEntry): boolean {
  return Object.values(entry.canastas).every((count) => count === 0)
}

function persist() {
  const entries = { A: entriesA.value, B: entriesB.value }
  if (isEdit.value) {
    sessionsStore.updateRound(sessionId.value, gameIndex.value, roundIndex.value, entries)
  } else {
    sessionsStore.addRound(sessionId.value, gameIndex.value, entries)
  }
  sessionsStore.advanceGame(sessionId.value)
  router.push(`/sessions/${sessionId.value}/games/${gameIndex.value}`)
}

function save() {
  if (validation.value.valid) persist()
}
</script>

<template>
  <div v-if="session && game">
    <h1 class="mb-4 text-2xl font-bold">
      {{ t(isEdit ? 'roundEntry.editTitle' : 'roundEntry.title') }}
    </h1>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <TeamRoundForm
          v-model="entriesA"
          :players="playersFor('A')"
          :team-label="t('game.team.A')"
        />
        <p
          v-if="noCanastasClosed(entriesA)"
          class="mt-2 text-sm text-amber-700"
        >
          {{ t('roundEntry.noCanastasWarning') }}
        </p>
        <ScorePreview
          class="mt-3"
          :breakdown="breakdownA"
          :team-label="t('game.team.A')"
        />
      </div>
      <div>
        <TeamRoundForm
          v-model="entriesB"
          :players="playersFor('B')"
          :team-label="t('game.team.B')"
        />
        <p
          v-if="noCanastasClosed(entriesB)"
          class="mt-2 text-sm text-amber-700"
        >
          {{ t('roundEntry.noCanastasWarning') }}
        </p>
        <ScorePreview
          class="mt-3"
          :breakdown="breakdownB"
          :team-label="t('game.team.B')"
        />
      </div>
    </div>

    <div
      v-if="!validation.valid"
      class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
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

    <div class="mt-6">
      <BaseButton @click="save">
        {{ t('roundEntry.save') }}
      </BaseButton>
    </div>
  </div>
</template>
