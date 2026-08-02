<script setup lang="ts">
const props = defineProps<{ modelValue: number; label: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

function dec() {
  emit('update:modelValue', Math.max(0, props.modelValue - 1))
}
function inc() {
  emit('update:modelValue', props.modelValue + 1)
}
function onInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  emit('update:modelValue', Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0)
}
</script>

<template>
  <div class="flex items-center justify-between gap-2 py-2">
    <span class="text-sm text-walnut">{{ label }}</span>
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center rounded-xl border border-rose/40 bg-linen text-lg text-clay transition-colors hover:bg-rose/30 active:scale-95"
        @click="dec"
      >
        −
      </button>
      <input
        :value="modelValue"
        type="number"
        inputmode="numeric"
        min="0"
        class="w-14 rounded-lg border border-rose/40 bg-ivory py-2 text-center text-base text-walnut tabular-nums focus:border-wine focus:outline-none focus:ring-1 focus:ring-wine/30"
        @input="onInput"
      >
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center rounded-xl border border-rose/40 bg-linen text-lg text-clay transition-colors hover:bg-rose/30 active:scale-95"
        @click="inc"
      >
        +
      </button>
    </div>
  </div>
</template>
