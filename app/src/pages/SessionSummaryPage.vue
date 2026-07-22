<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSessionsStore } from '../stores/sessions'

const route = useRoute()
const { t } = useI18n()
const sessionsStore = useSessionsStore()

const session = computed(() => sessionsStore.findSession(route.params.id as string))
const tallies = computed(() => (session.value ? sessionsStore.getSessionTallies(session.value.id) : {}))
const winners = computed(() => (session.value ? sessionsStore.getSessionWinner(session.value.id) : []))

function playerName(id: string): string {
  return session.value?.players.find((p) => p.id === id)?.name ?? id
}

const sortedTallies = computed(() =>
  session.value
    ? [...session.value.players]
        .map((p) => ({ ...p, score: tallies.value[p.id] ?? 0 }))
        .sort((a, b) => b.score - a.score)
    : [],
)
</script>

<template>
  <div v-if="session">
    <h1 class="mb-4 text-2xl font-bold">
      {{ t('summary.title') }}
    </h1>

    <div class="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
      <p class="text-sm font-medium text-amber-700">
        {{ winners.length > 1 ? t('summary.winners') : t('summary.winner') }}
      </p>
      <p class="text-xl font-bold text-amber-900">
        {{ winners.map(playerName).join(' / ') }}
      </p>
    </div>

    <h2 class="mb-2 font-semibold">
      {{ t('summary.individualTallies') }}
    </h2>
    <ol class="mb-6 space-y-1">
      <li
        v-for="player in sortedTallies"
        :key="player.id"
        class="flex justify-between rounded border border-neutral-200 px-3 py-2 text-sm"
      >
        <span>{{ player.name }}</span>
        <span class="tabular-nums font-medium">{{ player.score }}</span>
      </li>
    </ol>

    <h2 class="mb-2 font-semibold">
      {{ t('summary.perGameMatrix') }}
    </h2>
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-neutral-500">
          <th class="py-1">
            {{ t('summary.gameColumn') }}
          </th>
          <th class="py-1">
            {{ t('game.team.A') }}
          </th>
          <th class="py-1">
            {{ t('game.team.B') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(_game, i) in session.games"
          :key="i"
          class="border-t border-neutral-100"
        >
          <td class="py-1">
            {{ i + 1 }}
          </td>
          <td class="py-1 tabular-nums">
            {{ sessionsStore.getGameTotals(session.id, i).A }}
          </td>
          <td class="py-1 tabular-nums">
            {{ sessionsStore.getGameTotals(session.id, i).B }}
          </td>
        </tr>
      </tbody>
    </table>

    <RouterLink
      :to="`/sessions/${session.id}`"
      class="mt-6 inline-block text-sm text-indigo-600 hover:underline"
    >
      {{ t('summary.backToSession') }}
    </RouterLink>
  </div>
</template>
