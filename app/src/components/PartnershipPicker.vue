<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Player, PlayerId, TeamId } from '../domain/types'

const props = defineProps<{
  players: Player[]
  modelValue: Record<TeamId, PlayerId[]>
  teamSize: number
}>()
const emit = defineEmits<{ 'update:modelValue': [value: Record<TeamId, PlayerId[]>] }>()
const { t } = useI18n()

function teamOf(id: PlayerId): TeamId | null {
  if (props.modelValue.A.includes(id)) return 'A'
  if (props.modelValue.B.includes(id)) return 'B'
  return null
}

/** Cycles a player through unassigned -> A -> B -> unassigned. */
function cycle(id: PlayerId) {
  const current = teamOf(id)
  const A = props.modelValue.A.filter((p) => p !== id)
  const B = props.modelValue.B.filter((p) => p !== id)

  if (current === null) A.push(id)
  else if (current === 'A') B.push(id)
  // current === 'B' -> leave unassigned

  emit('update:modelValue', { A, B })
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
        :class="{
          'border-wine bg-wine text-white shadow-sm shadow-wine/20': teamOf(player.id) === 'A',
          'border-sage bg-sage text-white shadow-sm shadow-sage/20': teamOf(player.id) === 'B',
          'border-rose/40 bg-linen text-walnut hover:bg-rose/30': teamOf(player.id) === null,
        }"
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
      {{ t('game.team.A') }}: {{ modelValue.A.length }}/{{ teamSize }} ·
      {{ t('game.team.B') }}: {{ modelValue.B.length }}/{{ teamSize }}
    </p>
  </div>
</template>
