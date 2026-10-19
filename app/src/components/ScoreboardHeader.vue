<script setup lang="ts">
import { computed } from 'vue'
import { teamsForGame } from '../domain/constants'
import type { Game, TeamId } from '../domain/types'

const props = defineProps<{
  game: Game
  totals: Record<TeamId, number>
  /** Each team's display label — its members' names. */
  names: Record<TeamId, string>
}>()

const teams = computed(() => teamsForGame(props.game.partnership))

const teamColors: Record<TeamId, { border: string; bg: string; text: string }> = {
  A: { border: 'border-wine/30', bg: 'bg-wine-light', text: 'text-wine' },
  B: { border: 'border-sage/30', bg: 'bg-sage-light', text: 'text-sage' },
  C: { border: 'border-gold/30', bg: 'bg-gold-light', text: 'text-gold' },
}
</script>

<template>
  <div
    class="grid gap-4"
    :class="teams.length === 3 ? 'grid-cols-3' : 'grid-cols-2'"
  >
    <div
      v-for="team in teams"
      :key="team"
      class="rounded-2xl border p-5 text-center"
      :class="[teamColors[team].border, teamColors[team].bg]"
    >
      <p
        class="mb-1 break-words text-sm font-semibold"
        :class="teamColors[team].text"
      >
        {{ names[team] }}
      </p>
      <p class="font-display text-3xl text-walnut tabular-nums">
        {{ totals[team] }}
      </p>
    </div>
  </div>
</template>
