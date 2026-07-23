<script setup lang="ts">
withDefaults(defineProps<{ type?: 'button' | 'submit' | 'reset' }>(), { type: 'button' })
</script>

<template>
  <button
    :type="type"
    class="min-h-11 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
  >
    <slot />
  </button>
</template>
