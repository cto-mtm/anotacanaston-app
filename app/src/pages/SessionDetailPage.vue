<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSessionsStore } from '../stores/sessions'
import { parseLocalDate } from '../lib/date'

const route = useRoute()
const router = useRouter()
const { t, d } = useI18n()
const sessionsStore = useSessionsStore()

const session = computed(() => sessionsStore.findSession(route.params.id as string))
const tallies = computed(() => (session.value ? sessionsStore.getSessionTallies(session.value.id) : {}))

function gameLink(index: number): string {
  return `/sessions/${session.value?.id}/games/${index}`
}

function onDelete() {
  if (!session.value) return
  if (confirm(t('sessionDetail.confirmDeleteSession'))) {
    sessionsStore.deleteSession(session.value.id)
    router.push('/')
  }
}
</script>

<template>
  <div v-if="session">
    <div class="mb-6 flex items-start justify-between">
      <div :style="{ viewTransitionName: 'session-' + session.id }">
        <h1
          class="text-2xl font-bold"
          :style="{ viewTransitionName: 'session-title-' + session.id }"
        >
          {{ d(parseLocalDate(session.date), 'short') }}
        </h1>
        <p class="text-sm text-neutral-500">
          {{ t(`game.playerCount.${session.playerCount}`) }}
        </p>
      </div>
      <RouterLink
        v-if="session.status === 'finished'"
        :to="`/sessions/${session.id}/summary`"
        class="text-sm text-indigo-600 hover:underline"
      >
        {{ t('sessionDetail.viewSummary') }}
      </RouterLink>
    </div>

    <h2 class="mb-2 font-semibold">
      {{ t('summary.individualTallies') }}
    </h2>
    <ul class="mb-6 grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
      <li
        v-for="player in session.players"
        :key="player.id"
        class="flex justify-between rounded border border-neutral-200 px-2 py-1"
      >
        <span>{{ player.name }}</span>
        <span class="tabular-nums text-neutral-500">{{ tallies[player.id] ?? 0 }}</span>
      </li>
    </ul>

    <h2 class="mb-2 font-semibold">
      {{ t('sessionDetail.gamesTitle') }}
    </h2>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <RouterLink
        v-for="(_game, i) in session.games"
        :key="i"
        :to="gameLink(i)"
        class="rounded-lg border border-neutral-200 bg-white p-3 hover:border-indigo-300"
      >
        <p class="font-medium">
          {{ t('gameScreen.title', { n: i + 1 }) }}
        </p>
        <p class="text-sm text-neutral-500">
          {{ t('game.team.A') }} {{ sessionsStore.getGameTotals(session.id, i).A }} —
          {{ t('game.team.B') }} {{ sessionsStore.getGameTotals(session.id, i).B }}
        </p>
        <p
          v-if="sessionsStore.getGameResult(session.id, i).finished"
          class="text-xs text-green-600"
        >
          {{ t('gameScreen.finished') }}
        </p>
      </RouterLink>
    </div>

    <button
      type="button"
      class="mt-8 text-sm text-red-600 underline"
      @click="onDelete"
    >
      {{ t('sessionDetail.deleteSession') }}
    </button>
  </div>
</template>
