<script setup lang="ts">
import type { Player, PlayerId } from '../domain/types'

const props = defineProps<{
  players: Player[]
  modelValue: PlayerId | null
  excludeIds?: PlayerId[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: PlayerId] }>()

function isExcluded(id: PlayerId): boolean {
  return props.excludeIds?.includes(id) ?? false
}
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="player in players"
      :key="player.id"
      type="button"
      :disabled="isExcluded(player.id)"
      class="min-h-11 rounded-full border px-4 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      :class="
        modelValue === player.id
          ? 'border-indigo-600 bg-indigo-600 text-white'
          : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100'
      "
      @click="emit('update:modelValue', player.id)"
    >
      {{ player.name }}
    </button>
  </div>
</template>
