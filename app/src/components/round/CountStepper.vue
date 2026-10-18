<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    modelValue: number
    /** Accessible name — what is being counted. */
    label: string
    min?: number
    max?: number
    /** Lets the count itself be typed (card counts can run into the dozens). */
    editable?: boolean
    tone?: 'rose' | 'gold'
  }>(),
  { min: 0, max: Number.POSITIVE_INFINITY, editable: false, tone: 'rose' },
)
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
const { t } = useI18n()

function set(value: number) {
  if (!Number.isFinite(value)) value = props.min
  value = Math.trunc(value)
  // Only cap increases: a count already over max (e.g. an old entry) steps down one at a time.
  if (value > props.modelValue) value = Math.min(props.max, value)
  const next = Math.max(props.min, value)
  if (next !== props.modelValue) emit('update:modelValue', next)
}

function onInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value
  set(raw === '' ? props.min : Number(raw))
}

function selectAll(event: FocusEvent) {
  ;(event.target as HTMLInputElement).select()
}
</script>

<template>
  <div
    class="inline-flex shrink-0 items-center rounded-xl border bg-ivory"
    :class="tone === 'gold' ? 'border-gold/40' : 'border-rose/40'"
    role="group"
    :aria-label="label"
  >
    <button
      type="button"
      class="flex h-10 w-9 items-center justify-center rounded-l-xl text-lg text-clay transition-colors active:bg-rose/30 disabled:opacity-30"
      :disabled="modelValue <= min"
      :aria-label="t('roundEntry.ariaLess', { label })"
      @click="set(modelValue - 1)"
    >
      −
    </button>
    <input
      v-if="editable"
      type="number"
      inputmode="numeric"
      :min="min"
      class="h-10 w-10 bg-transparent text-center text-base font-semibold tabular-nums text-walnut [appearance:textfield] focus:outline-none focus:ring-2 focus:ring-wine/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      :class="{ 'text-clay/60': modelValue === 0 }"
      :value="modelValue"
      :aria-label="label"
      @focus="selectAll"
      @input="onInput"
    >
    <span
      v-else
      class="w-7 text-center text-base font-semibold tabular-nums"
      :class="modelValue === 0 ? 'text-clay/50' : 'text-walnut'"
      aria-live="polite"
    >{{ modelValue }}</span>
    <button
      type="button"
      class="flex h-10 w-9 items-center justify-center rounded-r-xl text-lg text-clay transition-colors active:bg-rose/30 disabled:opacity-30"
      :disabled="modelValue >= max"
      :aria-label="t('roundEntry.ariaMore', { label })"
      @click="set(modelValue + 1)"
    >
      +
    </button>
  </div>
</template>
