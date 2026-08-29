<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  label: string
  /** Regular canasta count. */
  base: number
  /** "En mano" canasta count (scores 2x). */
  enMano: number
}>()
const emit = defineEmits<{
  'update:base': [value: number]
  'update:enMano': [value: number]
}>()
const { t } = useI18n()

function clamp(value: number): number {
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0
}

function stepBase(delta: number) {
  emit('update:base', Math.max(0, props.base + delta))
}
function stepEnMano(delta: number) {
  emit('update:enMano', Math.max(0, props.enMano + delta))
}
function onBaseInput(event: Event) {
  emit('update:base', clamp(Number((event.target as HTMLInputElement).value)))
}
function onEnManoInput(event: Event) {
  emit('update:enMano', clamp(Number((event.target as HTMLInputElement).value)))
}
</script>

<template>
  <div class="border-t border-rose/20 py-2 first:border-t-0">
    <p class="mb-1.5 text-sm font-medium text-walnut">
      {{ label }}
    </p>
    <div class="flex flex-col gap-2 sm:flex-row">
      <!-- Regular -->
      <div class="flex flex-1 items-center justify-between gap-1 rounded-xl bg-ivory/60 px-2 py-1">
        <span class="shrink-0 pl-1 text-xs text-clay">{{ t('roundEntry.canastaNormal') }}</span>
        <div class="flex shrink-0 items-center gap-1">
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose/40 bg-linen text-lg text-clay transition-colors hover:bg-rose/30 active:scale-95"
            :aria-label="`${label} ${t('roundEntry.canastaNormal')} −`"
            @click="stepBase(-1)"
          >
            −
          </button>
          <input
            :value="base"
            type="number"
            inputmode="numeric"
            min="0"
            class="w-10 rounded-lg border border-rose/40 bg-ivory py-1.5 text-center text-base text-walnut tabular-nums focus:border-wine focus:outline-none focus:ring-1 focus:ring-wine/30"
            :aria-label="`${label} ${t('roundEntry.canastaNormal')}`"
            @input="onBaseInput"
          >
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose/40 bg-linen text-lg text-clay transition-colors hover:bg-rose/30 active:scale-95"
            :aria-label="`${label} ${t('roundEntry.canastaNormal')} +`"
            @click="stepBase(1)"
          >
            +
          </button>
        </div>
      </div>

      <!-- En mano (2x) -->
      <div class="flex flex-1 items-center justify-between gap-1 rounded-xl bg-gold-light/50 px-2 py-1">
        <span class="shrink-0 pl-1 text-xs font-medium text-gold">{{ t('roundEntry.canastaEnMano') }}</span>
        <div class="flex shrink-0 items-center gap-1">
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold/40 bg-linen text-lg text-clay transition-colors hover:bg-gold/20 active:scale-95"
            :aria-label="`${label} ${t('roundEntry.canastaEnMano')} −`"
            @click="stepEnMano(-1)"
          >
            −
          </button>
          <input
            :value="enMano"
            type="number"
            inputmode="numeric"
            min="0"
            class="w-10 rounded-lg border border-gold/40 bg-ivory py-1.5 text-center text-base text-walnut tabular-nums focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30"
            :aria-label="`${label} ${t('roundEntry.canastaEnMano')}`"
            @input="onEnManoInput"
          >
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold/40 bg-linen text-lg text-clay transition-colors hover:bg-gold/20 active:scale-95"
            :aria-label="`${label} ${t('roundEntry.canastaEnMano')} +`"
            @click="stepEnMano(1)"
          >
            +
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
