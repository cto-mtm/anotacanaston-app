<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSessionsStore } from '../stores/sessions'
import { parseLocalDate } from '../lib/date'
import BackButton from '../components/BackButton.vue'
import TrashIcon from '../components/icons/TrashIcon.vue'

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
    <BackButton to="/" />

    <div class="mb-6 flex items-start justify-between">
      <div :style="{ viewTransitionName: 'session-' + session.id }">
        <h1
          class="font-display text-2xl text-walnut"
          :style="{ viewTransitionName: 'session-title-' + session.id }"
        >
          {{ d(parseLocalDate(session.date), 'short') }}
        </h1>
        <p class="text-sm text-clay">
          {{ t(`game.playerCount.${session.playerCount}`) }}
        </p>
      </div>
      <RouterLink
        v-if="session.status === 'finished'"
        :to="`/sessions/${session.id}/summary`"
        class="text-sm font-medium text-wine transition-colors hover:text-walnut hover:underline"
      >
        {{ t('sessionDetail.viewSummary') }}
      </RouterLink>
    </div>

    <h2 class="mb-2 font-display text-lg text-walnut">
      {{ t('summary.individualTallies') }}
    </h2>
    <ul class="mb-6 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
      <li
        v-for="player in session.players"
        :key="player.id"
        class="flex justify-between rounded-xl border border-rose/40 bg-linen px-3 py-2"
      >
        <span class="text-walnut">{{ player.name }}</span>
        <span class="tabular-nums text-clay">{{ tallies[player.id] ?? 0 }}</span>
      </li>
    </ul>

    <h2 class="mb-2 font-display text-lg text-walnut">
      {{ t('sessionDetail.gamesTitle') }}
    </h2>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <RouterLink
        v-for="(_game, i) in session.games"
        :key="i"
        :to="gameLink(i)"
        class="rounded-2xl border border-rose/40 bg-linen p-4 transition-all hover:border-wine/40 hover:shadow-sm hover:shadow-walnut/5"
      >
        <p class="font-semibold text-walnut">
          {{ t('gameScreen.title', { n: i + 1 }) }}
        </p>
        <p class="text-sm text-clay">
          {{ t('game.team.A') }} {{ sessionsStore.getGameTotals(session.id, i).A }} —
          {{ t('game.team.B') }} {{ sessionsStore.getGameTotals(session.id, i).B }}
          <template v-if="sessionsStore.getGameTeams(session.id, i).includes('C')">
            — {{ t('game.team.C') }} {{ sessionsStore.getGameTotals(session.id, i).C }}
          </template>
        </p>
        <p
          v-if="sessionsStore.getGameResult(session.id, i).finished"
          class="text-xs font-medium text-sage"
        >
          {{ t('gameScreen.finished') }}
        </p>
      </RouterLink>
    </div>

    <button
      type="button"
      class="mt-8 flex h-11 w-11 items-center justify-center rounded-xl text-wine/60 transition-colors hover:bg-wine-light hover:text-wine"
      :aria-label="t('sessionDetail.deleteSession')"
      :title="t('sessionDetail.deleteSession')"
      @click="onDelete"
    >
      <TrashIcon class="h-5 w-5" />
    </button>
  </div>
</template>
