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
      class="rounded-2xl border p-5 text-center"
      :class="team === 'A' ? 'border-wine/30 bg-wine-light' : 'border-sage/30 bg-sage-light'"
    >
      <p
        class="text-sm font-semibold"
        :class="team === 'A' ? 'text-wine' : 'text-sage'"
      >
        {{ t(`game.team.${team}`) }}
      </p>
      <p class="mb-1 text-xs text-clay">
        {{ namesFor(team) }}
      </p>
      <p class="font-display text-3xl text-walnut tabular-nums">
        {{ totals[team] }}
      </p>
    </div>
  </div>
</template>
