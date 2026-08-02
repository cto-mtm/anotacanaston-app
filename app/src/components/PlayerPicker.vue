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
      class="min-h-11 rounded-full border px-5 py-2.5 text-sm font-medium transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      :class="
        modelValue === player.id
          ? 'border-wine bg-wine text-white shadow-sm shadow-wine/20'
          : 'border-rose/40 bg-linen text-walnut hover:bg-rose/30'
      "
      @click="emit('update:modelValue', player.id)"
    >
      {{ player.name }}
    </button>
  </div>
</template>
