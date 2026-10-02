<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSessionsStore } from '../stores/sessions'
import { scoreRound } from '../domain/scoring'
import ScoreboardHeader from '../components/ScoreboardHeader.vue'
import ThresholdBanner from '../components/ThresholdBanner.vue'
import BaseButton from '../components/BaseButton.vue'
import BackButton from '../components/BackButton.vue'
import PencilIcon from '../components/icons/PencilIcon.vue'
import TrashIcon from '../components/icons/TrashIcon.vue'
import type { TeamId } from '../domain/types'

const route = useRoute()
const { t } = useI18n()
const sessionsStore = useSessionsStore()

const sessionId = computed(() => route.params.id as string)
const gameIndex = computed(() => Number(route.params.g))

const session = computed(() => sessionsStore.findSession(sessionId.value))
const game = computed(() => session.value?.games[gameIndex.value])

const teams = computed(() => sessionsStore.getGameTeams(sessionId.value, gameIndex.value))
const totals = computed(() => sessionsStore.getGameTotals(sessionId.value, gameIndex.value))
const thresholds = computed(() => sessionsStore.getMeldThresholds(sessionId.value, gameIndex.value))
const result = computed(() => sessionsStore.getGameResult(sessionId.value, gameIndex.value))

const isLastGame = computed(() => (session.value ? gameIndex.value === session.value.games.length - 1 : false))

function roundTotal(roundIndex: number, team: TeamId): number {
  const round = game.value?.rounds[roundIndex]
  return round ? scoreRound(round.entries[team], sessionsStore.getSessionRules(sessionId.value)).total : 0
}

function onDeleteRound(roundIndex: number) {
  if (confirm(t('gameScreen.confirmDeleteRound'))) {
    sessionsStore.deleteRound(sessionId.value, gameIndex.value, roundIndex)
  }
}
</script>

<template>
  <div v-if="session && game">
    <BackButton :to="`/sessions/${sessionId}`" />

    <h1 class="mb-5 font-display text-2xl text-walnut">
      {{ t('gameScreen.title', { n: gameIndex + 1 }) }}
    </h1>

    <ScoreboardHeader
      :game="game"
      :totals="totals"
      :players="session.players"
    />

    <div
      v-if="result.finished"
      class="my-5 rounded-2xl border border-sage/30 bg-sage-light p-4 text-sage"
    >
      <p class="font-semibold">
        {{ t('gameScreen.finished') }}
      </p>
      <p v-if="result.winner">
        {{ t('gameScreen.winner', { team: t(`game.team.${result.winner}`) }) }}
      </p>
      <RouterLink
        v-if="!isLastGame"
        :to="`/sessions/${sessionId}/games/${gameIndex + 1}`"
        class="mt-1 inline-block text-sm underline"
      >
        {{ t('gameScreen.nextGame') }}
      </RouterLink>
      <RouterLink
        v-else
        :to="`/sessions/${sessionId}/summary`"
        class="mt-1 inline-block text-sm underline"
      >
        {{ t('gameScreen.viewSummary') }}
      </RouterLink>
    </div>

    <div
      class="my-5 grid gap-4"
      :class="teams.length === 3 ? 'grid-cols-3' : 'grid-cols-2'"
    >
      <ThresholdBanner
        v-for="team in teams"
        :key="team"
        :team="team"
        :threshold="thresholds[team]"
      />
    </div>

    <details class="mb-5 rounded-2xl border border-rose/40 bg-linen p-4 text-sm">
      <summary class="cursor-pointer font-medium text-walnut">
        {{ t('gameScreen.pilonTriadoInfo') }}
      </summary>
      <p class="mt-2 text-clay">
        {{ t('gameScreen.pilonTriadoBody') }}
      </p>
    </details>

    <div class="mb-4 flex items-center justify-between">
      <h2 class="font-display text-lg text-walnut">
        {{ t('gameScreen.roundHistory') }}
      </h2>
      <RouterLink :to="`/sessions/${sessionId}/games/${gameIndex}/rounds/new`">
        <BaseButton>{{ t('gameScreen.addRound') }}</BaseButton>
      </RouterLink>
    </div>

    <p
      v-if="game.rounds.length === 0"
      class="text-clay"
    >
      {{ t('gameScreen.noRounds') }}
    </p>
    <ul
      v-else
      class="space-y-2"
    >
      <li
        v-for="(_round, i) in game.rounds"
        :key="i"
        class="flex items-center justify-between rounded-xl border border-rose/40 bg-linen px-4 py-3 text-sm"
      >
        <span class="text-walnut">
          <span v-for="(team, ti) in teams" :key="team">
            <span v-if="ti > 0"> · </span>
            {{ t(`game.team.${team}`) }}: {{ roundTotal(i, team) }}
          </span>
        </span>
        <span class="flex gap-1">
          <RouterLink
            :to="`/sessions/${sessionId}/games/${gameIndex}/rounds/${i}`"
            class="flex h-10 w-10 items-center justify-center rounded-xl text-clay transition-colors hover:bg-rose/30 hover:text-walnut"
            :aria-label="t('gameScreen.editRound')"
            :title="t('gameScreen.editRound')"
          >
            <PencilIcon class="h-5 w-5" />
          </RouterLink>
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-xl text-wine/70 transition-colors hover:bg-wine-light hover:text-wine"
            :aria-label="t('gameScreen.deleteRound')"
            :title="t('gameScreen.deleteRound')"
            @click="onDeleteRound(i)"
          >
            <TrashIcon class="h-5 w-5" />
          </button>
        </span>
      </li>
    </ul>
  </div>
</template>
