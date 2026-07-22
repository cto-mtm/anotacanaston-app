<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Game, Player, TeamId } from '../domain/types'

const props = defineProps<{
  game: Game
  totals: Record<TeamId, number>
  players: Player[]
}>()
const { t } = useI18n()

function namesFor(team: TeamId): string {
  return props.game.partnership[team]
    .map((id) => props.players.find((p) => p.id === id)?.name ?? id)
    .join(' / ')
}
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <div
      v-for="team in (['A', 'B'] as const)"
      :key="team"
      class="rounded-xl border border-neutral-200 bg-white p-4 text-center"
    >
      <p class="text-sm font-medium text-neutral-500">
        {{ t(`game.team.${team}`) }}
      </p>
      <p class="mb-1 text-xs text-neutral-400">
        {{ namesFor(team) }}
      </p>
      <p class="text-3xl font-bold tabular-nums">
        {{ totals[team] }}
      </p>
    </div>
  </div>
</template>
