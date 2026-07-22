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
        class="rounded-full border px-3 py-1.5 text-sm transition-colors"
        :class="{
          'border-indigo-600 bg-indigo-600 text-white': teamOf(player.id) === 'A',
          'border-rose-600 bg-rose-600 text-white': teamOf(player.id) === 'B',
          'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100': teamOf(player.id) === null,
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
    <p class="mt-2 text-xs text-neutral-500">
      {{ t('game.team.A') }}: {{ modelValue.A.length }}/{{ teamSize }} ·
      {{ t('game.team.B') }}: {{ modelValue.B.length }}/{{ teamSize }}
    </p>
  </div>
</template>
