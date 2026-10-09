<script setup lang="ts">
// Player dashboard: headline totals (KPI row of stat tiles), the leaderboard
// as a ranked list with a game-win-rate meter, best partnerships and the
// all-time record. All numbers come from domain/stats.ts — nothing computed here.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionsStore } from '../stores/sessions'
import { computeDashboardStats, winRate } from '../domain/stats'
import { parseLocalDate } from '../lib/date'
import BaseButton from '../components/BaseButton.vue'
import WeaveWatermark from '../components/WeaveWatermark.vue'
import RankCard from '../components/RankCard.vue'
import CardStackIcon from '../components/icons/CardStackIcon.vue'

const { t, n, d } = useI18n()
const sessionsStore = useSessionsStore()

const stats = computed(() => computeDashboardStats(sessionsStore.sessions))
const hasStats = computed(() => stats.value.totals.finishedSessions > 0)

const TOTALS = ['sessions', 'games', 'rounds'] as const

function gameWinRate(wins: number, played: number): number {
  return winRate(wins, played) ?? 0
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-8">
    <div>
      <h1 class="font-display text-2xl text-walnut">
        {{ t('dashboard.title') }}
      </h1>
      <p class="mt-1 text-sm text-clay">
        {{ t('dashboard.intro') }}
      </p>
    </div>

    <!-- Empty state -->
    <section
      v-if="!hasStats"
      class="rounded-2xl border border-rose/40 bg-linen p-6 text-center"
    >
      <span
        class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose/30 text-walnut"
        aria-hidden="true"
      >
        <CardStackIcon class="h-7 w-7" />
      </span>
      <h2 class="mt-2 font-display text-lg text-walnut">
        {{ t('dashboard.emptyTitle') }}
      </h2>
      <p class="mt-1 text-sm text-clay">
        {{ t('dashboard.emptyBody') }}
      </p>
      <RouterLink
        to="/sessions/new"
        class="mt-4 inline-block"
      >
        <BaseButton>{{ t('dashboard.newSession') }}</BaseButton>
      </RouterLink>
      <!-- Fixed-position, so it sits in the page corner, not in this card. -->
      <WeaveWatermark />
    </section>

    <template v-else>
      <!-- KPI row -->
      <section class="grid grid-cols-3 gap-3">
        <div
          v-for="key in TOTALS"
          :key="key"
          class="rounded-2xl border border-rose/40 bg-linen px-3 py-4 text-center"
        >
          <p class="text-2xl font-semibold tabular-nums text-walnut">
            {{ n(stats.totals[key]) }}
          </p>
          <p class="mt-0.5 text-xs text-clay">
            {{ t(`dashboard.totals.${key}`) }}
          </p>
        </div>
      </section>

      <!-- Leaderboard -->
      <section>
        <h2 class="font-display text-lg text-walnut">
          {{ t('dashboard.leaderboardTitle') }}
        </h2>
        <p class="mb-3 text-xs text-clay">
          {{ t('dashboard.leaderboardHint') }}
        </p>
        <ol class="space-y-2">
          <li
            v-for="(player, i) in stats.players"
            :key="player.key"
            class="flex items-center gap-3 rounded-2xl border px-4 py-3"
            :class="i === 0 ? 'border-gold/40 bg-gold-light' : 'border-rose/40 bg-linen'"
          >
            <RankCard
              :rank="i + 1"
              class="shrink-0"
              aria-hidden="true"
            />
            <span class="sr-only">{{ t('dashboard.rank', { n: i + 1 }) }}</span>

            <div class="min-w-0 flex-1">
              <div class="flex items-baseline justify-between gap-2">
                <p class="truncate font-medium text-walnut">
                  {{ player.name }}
                </p>
                <p class="shrink-0 text-sm font-semibold tabular-nums text-walnut">
                  {{ t('dashboard.sessionWins', player.sessionWins) }}
                  <span class="font-normal text-clay">{{ t('dashboard.sessionsPlayed', player.sessionsPlayed) }}</span>
                </p>
              </div>

              <!-- Game win rate: same-ramp meter (wine on a light wine track) -->
              <div class="mt-2 flex items-center gap-2">
                <div
                  class="h-2 flex-1 overflow-hidden rounded-full bg-wine-light"
                  role="meter"
                  :aria-label="t('dashboard.winRateLabel', { name: player.name })"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-valuenow="Math.round(gameWinRate(player.gameWins, player.gamesPlayed) * 100)"
                >
                  <div
                    class="h-full rounded-full bg-wine"
                    :style="{ width: `${gameWinRate(player.gameWins, player.gamesPlayed) * 100}%` }"
                  />
                </div>
                <span class="shrink-0 text-xs tabular-nums text-clay">
                  {{ t('dashboard.winRate', { rate: n(gameWinRate(player.gameWins, player.gamesPlayed), 'percent') }) }}
                </span>
              </div>

              <p
                v-if="player.currentStreak >= 2 || player.bestStreak >= 2"
                class="mt-1 text-xs text-clay"
              >
                <span v-if="player.currentStreak >= 2">
                  <CardStackIcon
                    class="mb-0.5 inline h-3.5 w-3.5 text-wine"
                    aria-hidden="true"
                  /> {{ t('dashboard.streak', player.currentStreak) }}
                </span>
                <span v-if="player.currentStreak >= 2 && player.bestStreak > player.currentStreak"> · </span>
                <span v-if="player.bestStreak > player.currentStreak">
                  {{ t('dashboard.bestStreak', player.bestStreak) }}
                </span>
              </p>
            </div>
          </li>
        </ol>
      </section>

      <!-- Best partnerships -->
      <section>
        <h2 class="mb-3 font-display text-lg text-walnut">
          {{ t('dashboard.partnershipsTitle') }}
        </h2>
        <p
          v-if="stats.partnerships.length === 0"
          class="text-sm text-clay"
        >
          {{ t('dashboard.partnershipsEmpty') }}
        </p>
        <ul
          v-else
          class="space-y-2"
        >
          <li
            v-for="pair in stats.partnerships.slice(0, 3)"
            :key="pair.names.join('|')"
            class="flex items-center justify-between gap-3 rounded-2xl border border-rose/40 bg-linen px-4 py-3"
          >
            <span class="font-medium text-walnut">{{ pair.names.join(' & ') }}</span>
            <span class="text-right text-xs text-clay">
              {{ t('dashboard.partnershipRecord', { wins: pair.winsTogether, games: pair.gamesTogether }) }}
            </span>
          </li>
        </ul>
      </section>

      <!-- Record -->
      <section v-if="stats.bestGame">
        <h2 class="mb-3 font-display text-lg text-walnut">
          {{ t('dashboard.recordTitle') }}
        </h2>
        <RouterLink
          :to="`/sessions/${stats.bestGame.sessionId}`"
          class="block rounded-2xl border border-rose/40 bg-linen px-4 py-4 transition-colors hover:bg-rose/20"
        >
          <p class="text-xs text-clay">
            {{ t('dashboard.bestGame') }}
          </p>
          <p class="text-3xl font-semibold tabular-nums text-walnut">
            {{ n(stats.bestGame.points) }}
          </p>
          <p class="mt-0.5 text-sm text-clay">
            {{ t('dashboard.bestGameBy', { names: stats.bestGame.names.join(' & '), date: d(parseLocalDate(stats.bestGame.date), 'short') }) }}
          </p>
        </RouterLink>
      </section>
    </template>
  </div>
</template>
