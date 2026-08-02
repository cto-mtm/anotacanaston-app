<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSessionsStore } from '../stores/sessions'
import { scoreRound, validateRound, checkCardSupply } from '../domain/scoring'
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

// Both team panels always render (needed for the score preview/validation
// below), but on narrow screens only one is shown at a time via these tabs;
// md: and up shows both side by side regardless of this.
const activeTeam = ref<'A' | 'B'>('A')

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

// Non-blocking: unlike `validation`, these never stop the save — they're a
// heads-up that a canasta combination looks off given the deck in play.
const cardSupplyWarnings = computed(() =>
  checkCardSupply({ entries: { A: entriesA.value, B: entriesB.value } }, session.value?.playerCount ?? 4),
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
    <h1 class="mb-5 font-display text-2xl text-walnut">
      {{ t(isEdit ? 'roundEntry.editTitle' : 'roundEntry.title') }}
    </h1>

    <!-- Team tabs: mobile only, both panels always show on md: and up -->
    <div class="mb-4 flex gap-2 md:hidden">
      <button
        type="button"
        class="flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all active:scale-[0.97]"
        :class="activeTeam === 'A' ? 'border-wine bg-wine text-white shadow-sm shadow-wine/20' : 'border-rose/40 bg-linen text-walnut'"
        @click="activeTeam = 'A'"
      >
        {{ t('game.team.A') }}
      </button>
      <button
        type="button"
        class="flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all active:scale-[0.97]"
        :class="activeTeam === 'B' ? 'border-sage bg-sage text-white shadow-sm shadow-sage/20' : 'border-rose/40 bg-linen text-walnut'"
        @click="activeTeam = 'B'"
      >
        {{ t('game.team.B') }}
      </button>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div :class="{ hidden: activeTeam !== 'A', 'md:block': true }">
        <TeamRoundForm
          v-model="entriesA"
          :players="playersFor('A')"
          :team-label="t('game.team.A')"
        />
        <p
          v-if="noCanastasClosed(entriesA)"
          class="mt-2 text-sm text-gold"
        >
          {{ t('roundEntry.noCanastasWarning') }}
        </p>
        <ScorePreview
          class="mt-3"
          :breakdown="breakdownA"
          :team-label="t('game.team.A')"
        />
      </div>
      <div :class="{ hidden: activeTeam !== 'B', 'md:block': true }">
        <TeamRoundForm
          v-model="entriesB"
          :players="playersFor('B')"
          :team-label="t('game.team.B')"
        />
        <p
          v-if="noCanastasClosed(entriesB)"
          class="mt-2 text-sm text-gold"
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
