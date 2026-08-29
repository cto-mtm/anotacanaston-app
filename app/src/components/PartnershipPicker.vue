<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Player, PlayerId, TeamId } from '../domain/types'

const props = defineProps<{
  players: Player[]
  modelValue: Record<TeamId, PlayerId[]>
  teamSize: number
  /** Which teams are active in this picker (defaults to A+B). */
  teams?: TeamId[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: Record<TeamId, PlayerId[]>] }>()
const { t } = useI18n()

const activeTeams = computed(() => props.teams ?? (['A', 'B'] as TeamId[]))

import { computed } from 'vue'

function teamOf(id: PlayerId): TeamId | null {
  for (const team of activeTeams.value) {
    if (props.modelValue[team].includes(id)) return team
  }
  return null
}

/** Cycles a player through unassigned -> A -> B -> (C) -> unassigned. */
function cycle(id: PlayerId) {
  const current = teamOf(id)
  const teams = activeTeams.value
  const updated: Record<TeamId, PlayerId[]> = {
    A: props.modelValue.A.filter((p) => p !== id),
    B: props.modelValue.B.filter((p) => p !== id),
    C: props.modelValue.C.filter((p) => p !== id),
  }

  if (current === null) {
    // Assign to first team that isn't full
    for (const team of teams) {
      if (updated[team].length < props.teamSize) {
        updated[team].push(id)
        break
      }
    }
  } else {
    // Move to next team, or unassign if last team or all subsequent are full
    const currentIdx = teams.indexOf(current)
    for (let i = currentIdx + 1; i < teams.length; i++) {
      if (updated[teams[i]].length < props.teamSize) {
        updated[teams[i]].push(id)
        break
      }
    }
    // If none found, player stays unassigned (already removed above)
  }

  emit('update:modelValue', updated)
}

const teamColors: Record<TeamId, { active: string; label: string }> = {
  A: { active: 'border-wine bg-wine text-white shadow-sm shadow-wine/20', label: 'text-wine' },
  B: { active: 'border-sage bg-sage text-white shadow-sm shadow-sage/20', label: 'text-sage' },
  C: { active: 'border-gold bg-gold text-white shadow-sm shadow-gold/20', label: 'text-gold' },
}
</script>

<template>
  <div>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="player in players"
        :key="player.id"
        type="button"
        class="min-h-11 rounded-full border px-5 py-2.5 text-sm font-medium transition-all active:scale-95"
        :class="
          teamOf(player.id)
            ? teamColors[teamOf(player.id)!].active
            : 'border-rose/40 bg-linen text-walnut hover:bg-rose/30'
        "
        @click="cycle(player.id)"
      >
        {{ player.name }}
        <span
          v-if="teamOf(player.id)"
          class="ml-1 opacity-80"
        >({{ t(`game.team.${teamOf(player.id)}`) }})</span>
      </button>
    </div>
    <p class="mt-2 text-xs text-clay">
      <span v-for="(team, i) in activeTeams" :key="team">
        <span v-if="i > 0"> · </span>
        {{ t(`game.team.${team}`) }}: {{ modelValue[team].length }}/{{ teamSize }}
      </span>
    </p>
  </div>
</template>
