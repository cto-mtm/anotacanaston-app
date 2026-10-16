<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CountStepper from './CountStepper.vue'
import { CARD_GROUPS, CARD_POINTS, CARD_POINT_STEP, cardPoints, emptyCardCounts } from '../../domain/constants'
import type { CardCounts, CardGroup } from '../../domain/types'

/**
 * Points entry that stays traceable: either count the cards by value group
 * (the total is derived and the counts are kept as an audit trail) or type
 * the total directly, which is checked against the multiple-of-5 rule.
 */
const props = defineProps<{
  points: number
  cards?: CardCounts
  /** Accessible name prefix, e.g. the player's name or "Melded points". */
  label: string
}>()
const emit = defineEmits<{ change: [value: { points: number; cards?: CardCounts }] }>()
const { t, n } = useI18n()

const mode = computed<'cards' | 'total'>(() => (props.cards ? 'cards' : 'total'))
// Only flag the total once the scorer leaves the field: "85" passes
// through "8" on the way, and that shouldn't flash an error.
const blurred = ref(false)
const offStep = computed(() => props.points % CARD_POINT_STEP !== 0)
const showOffStep = computed(() => offStep.value && blurred.value)

// A typed total can't be turned into card counts, so switching to the
// counter starts from zero — but the typed total is remembered and comes
// back if the scorer switches back, so one stray tap never loses a score.
const typedTotal = ref<number | null>(null)

function setMode(next: 'cards' | 'total') {
  if (next === mode.value) return
  if (next === 'cards') {
    typedTotal.value = props.points > 0 ? props.points : null
    emit('change', { points: 0, cards: emptyCardCounts() })
  } else {
    const points = props.points === 0 && typedTotal.value !== null ? typedTotal.value : props.points
    typedTotal.value = null
    emit('change', { points })
  }
}

function setCount(group: CardGroup, count: number) {
  const cards = { ...(props.cards ?? emptyCardCounts()), [group]: count }
  emit('change', { points: cardPoints(cards), cards })
}

function onTotalInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  emit('change', { points: Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0 })
}
</script>

<template>
  <div>
    <div
      class="mb-3 grid grid-cols-2 rounded-xl border border-rose/40 bg-ivory p-0.5 text-sm"
      role="group"
      :aria-label="label"
    >
      <button
        v-for="option in (['cards', 'total'] as const)"
        :key="option"
        type="button"
        class="min-h-9 rounded-[10px] px-2 font-medium transition-colors"
        :class="mode === option ? 'bg-walnut text-white' : 'text-clay'"
        :aria-pressed="mode === option"
        @click="setMode(option)"
      >
        {{ t(option === 'cards' ? 'roundEntry.modeCards' : 'roundEntry.modeTotal') }}
      </button>
    </div>

    <div
      v-if="mode === 'cards' && cards"
      class="grid grid-cols-[minmax(0,1fr)_auto_3.25rem] items-center gap-x-2 gap-y-1.5"
    >
      <template
        v-for="group in CARD_GROUPS"
        :key="group"
      >
        <div class="min-w-0">
          <p class="text-sm leading-tight text-walnut">
            {{ t(`roundEntry.cardGroups.${group}`) }}
          </p>
          <p class="text-xs text-clay">
            {{ t('roundEntry.perCard', { points: CARD_POINTS[group] }) }}
          </p>
        </div>
        <CountStepper
          :model-value="cards[group]"
          :label="`${label} · ${t(`roundEntry.cardGroups.${group}`)}`"
          editable
          @update:model-value="setCount(group, $event)"
        />
        <span
          class="text-right text-sm tabular-nums"
          :class="cards[group] ? 'text-walnut' : 'text-clay/50'"
        >{{ n(cards[group] * CARD_POINTS[group]) }}</span>
      </template>
      <span class="col-span-2 border-t border-rose/30 pt-1.5 text-sm font-semibold text-walnut">
        {{ t('roundEntry.totalLabel') }}
      </span>
      <span class="border-t border-rose/30 pt-1.5 text-right text-sm font-semibold tabular-nums text-walnut">
        {{ n(points) }}
      </span>
      <p
        v-if="typedTotal !== null"
        class="col-span-3 text-xs text-clay"
      >
        {{ t('roundEntry.previousTotal', { points: n(typedTotal) }) }}
      </p>
    </div>

    <div v-else>
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm text-walnut">{{ t('roundEntry.totalLabel') }}</span>
        <input
          type="number"
          inputmode="numeric"
          min="0"
          :step="CARD_POINT_STEP"
          class="w-28 rounded-xl border bg-ivory py-2 text-center text-base font-semibold tabular-nums text-walnut focus:outline-none focus:ring-2"
          :class="showOffStep ? 'border-wine focus:ring-wine/30' : 'border-rose/40 focus:border-wine focus:ring-wine/30'"
          :value="points"
          :aria-label="label"
          :aria-invalid="showOffStep"
          @focus="($event.target as HTMLInputElement).select()"
          @input="onTotalInput"
          @blur="blurred = true"
        >
      </div>
      <p
        class="mt-1.5 text-xs text-wine"
        aria-live="polite"
      >
        <template v-if="showOffStep">
          {{ t('roundEntry.notMultipleOfFive') }}
        </template>
      </p>
    </div>
  </div>
</template>
