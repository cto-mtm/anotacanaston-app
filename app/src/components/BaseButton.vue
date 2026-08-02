<script setup lang="ts">
withDefaults(defineProps<{ type?: 'button' | 'submit' | 'reset'; variant?: 'primary' | 'secondary' }>(), { type: 'button', variant: 'primary' })
</script>

<template>
  <button
    :type="type"
    class="min-h-11 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
    :class="variant === 'primary'
      ? 'bg-wine text-white shadow-sm shadow-wine/20 hover:bg-wine/90'
      : 'border border-rose bg-linen text-walnut hover:bg-rose/30'"
  >
    <slot />
  </button>
</template>
