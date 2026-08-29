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
    <h1 class="mb-5 font-display text-2xl text-walnut">
      {{ t('summary.title') }}
    </h1>

    <div class="mb-6 rounded-2xl border border-gold/30 bg-gold-light p-5 text-center">
      <p class="text-sm font-medium text-gold">
        {{ winners.length > 1 ? t('summary.winners') : t('summary.winner') }}
      </p>
      <p class="font-display text-2xl text-walnut">
        {{ winners.map(playerName).join(' / ') }}
      </p>
    </div>

    <h2 class="mb-2 font-display text-lg text-walnut">
      {{ t('summary.individualTallies') }}
    </h2>
    <ol class="mb-6 space-y-2">
      <li
        v-for="(player, i) in sortedTallies"
        :key="player.id"
        class="flex justify-between rounded-xl border border-rose/40 px-4 py-3 text-sm"
        :class="i === 0 ? 'bg-gold-light border-gold/30' : 'bg-linen'"
      >
        <span class="font-medium text-walnut">{{ player.name }}</span>
        <span class="tabular-nums font-semibold text-walnut">{{ player.score }}</span>
      </li>
    </ol>

    <h2 class="mb-2 font-display text-lg text-walnut">
      {{ t('summary.perGameMatrix') }}
    </h2>
    <div class="overflow-hidden rounded-xl border border-rose/40 bg-linen">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-rose/30 text-left text-clay">
            <th class="px-4 py-2.5">
              {{ t('summary.gameColumn') }}
            </th>
            <th class="px-4 py-2.5">
              {{ t('game.team.A') }}
            </th>
            <th class="px-4 py-2.5">
              {{ t('game.team.B') }}
            </th>
            <th
              v-if="session.sixPlayerFormat === '3x2'"
              class="px-4 py-2.5"
            >
              {{ t('game.team.C') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(_game, i) in session.games"
            :key="i"
            class="border-t border-rose/20"
          >
            <td class="px-4 py-2.5 text-walnut">
              {{ i + 1 }}
            </td>
            <td class="px-4 py-2.5 tabular-nums text-walnut">
              {{ sessionsStore.getGameTotals(session.id, i).A }}
            </td>
            <td class="px-4 py-2.5 tabular-nums text-walnut">
              {{ sessionsStore.getGameTotals(session.id, i).B }}
            </td>
            <td
              v-if="session.sixPlayerFormat === '3x2'"
              class="px-4 py-2.5 tabular-nums text-walnut"
            >
              {{ sessionsStore.getGameTotals(session.id, i).C }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <RouterLink
      :to="`/sessions/${session.id}`"
      class="mt-6 inline-block text-sm font-medium text-wine transition-colors hover:text-walnut hover:underline"
    >
      {{ t('summary.backToSession') }}
    </RouterLink>
  </div>
</template>
