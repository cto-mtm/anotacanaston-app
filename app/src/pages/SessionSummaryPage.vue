<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSessionsStore } from '../stores/sessions'
import { parseLocalDate } from '../lib/date'
import { renderShareCard } from '../lib/shareCard'
import { shareImage } from '../lib/share'
import BaseButton from '../components/BaseButton.vue'

const route = useRoute()
const { t, d } = useI18n()
const sessionsStore = useSessionsStore()

const session = computed(() => sessionsStore.findSession(route.params.id as string))
const tallies = computed(() => (session.value ? sessionsStore.getSessionTallies(session.value.id) : {}))
const winners = computed(() => (session.value ? sessionsStore.getSessionWinner(session.value.id) : []))
const roundedScoring = computed(() =>
  session.value ? sessionsStore.getSessionRules(session.value.id).sessionScoring === 'roundedThousands' : false,
)

// Rounded tallies are ± differences, so the sign is part of the score.
function formatTally(score: number): string {
  return roundedScoring.value && score > 0 ? `+${score}` : String(score)
}

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

const sharing = ref(false)

async function onShare() {
  const current = session.value
  if (!current || sharing.value) return
  sharing.value = true
  try {
    // Wait for the app's web fonts so the canvas renders in Fondamento/DM Sans
    // rather than the generic fallback.
    if (document.fonts?.ready) await document.fonts.ready

    const dateLabel = d(parseLocalDate(current.date), 'short')
    const dataUrl = renderShareCard({
      dateLabel,
      winnerLabel: winners.value.length > 1 ? t('summary.winners') : t('summary.winner'),
      winnerNames: winners.value.map(playerName).join(' / '),
      talliesLabel: t('summary.individualTallies'),
      players: sortedTallies.value.map((p) => ({ name: p.name, score: formatTally(p.score) })),
      brandLabel: 'Anota Canaston',
      ctaLabel: t('summary.shareCta'),
    })

    const outcome = await shareImage({
      dataUrl,
      fileName: `anota-canaston-${current.date}`,
      title: 'Anota Canaston',
      text: t('summary.shareText'),
    })

    if (outcome === 'downloaded') alert(t('summary.shareDownloaded'))
    else if (outcome === 'unsupported') alert(t('summary.shareError'))
  } catch {
    alert(t('summary.shareError'))
  } finally {
    sharing.value = false
  }
}
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

    <h2 class="mb-1 font-display text-lg text-walnut">
      {{ t('summary.individualTallies') }}
    </h2>
    <p class="mb-2 text-xs text-clay">
      {{ roundedScoring ? t('summary.roundedScoringHint') : t('summary.rawScoringHint') }}
    </p>
    <ol class="mb-6 space-y-2">
      <li
        v-for="(player, i) in sortedTallies"
        :key="player.id"
        class="flex justify-between rounded-xl border border-rose/40 px-4 py-3 text-sm"
        :class="i === 0 ? 'bg-gold-light border-gold/30' : 'bg-linen'"
      >
        <span class="font-medium text-walnut">{{ player.name }}</span>
        <span class="tabular-nums font-semibold text-walnut">{{ formatTally(player.score) }}</span>
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

    <div class="mt-6 flex items-center justify-between gap-4">
      <RouterLink
        :to="`/sessions/${session.id}`"
        class="text-sm font-medium text-wine transition-colors hover:text-walnut hover:underline"
      >
        {{ t('summary.backToSession') }}
      </RouterLink>
      <BaseButton
        :disabled="sharing"
        @click="onShare"
      >
        {{ sharing ? t('summary.sharing') : t('summary.share') }}
      </BaseButton>
    </div>
  </div>
</template>
