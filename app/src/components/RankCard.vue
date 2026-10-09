<script setup lang="ts">
// Leaderboard rank as a tiny playing card (number + the logo's club) — the
// game's own vocabulary instead of sports medals. First place is gold.
import ClubIcon from './icons/ClubIcon.vue'

defineProps<{ rank: number }>()
</script>

<template>
  <span
    class="inline-flex h-9 w-7 flex-col items-center justify-center gap-0.5 rounded-md border bg-ivory font-semibold leading-none tabular-nums shadow-sm shadow-walnut/5"
    :class="rank === 1 ? 'border-gold/60 text-gold' : 'border-rose/70 text-clay'"
  >
    <span class="text-sm">{{ rank }}</span>
    <ClubIcon class="h-2.5 w-2.5" />
  </span>
</template>
