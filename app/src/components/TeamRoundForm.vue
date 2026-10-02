<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import CanastaCounterPair from './CanastaCounterPair.vue'
import { ALL_CANASTA_TYPES } from '../domain/constants'
import type { CanastaType, Player, TeamRoundEntry } from '../domain/types'

const props = defineProps<{ modelValue: TeamRoundEntry; players: Player[]; teamLabel: string; penaltyValue: number }>()
const emit = defineEmits<{ 'update:modelValue': [value: TeamRoundEntry] }>()
const { t } = useI18n()

function patch(partial: Partial<TeamRoundEntry>) {
  emit('update:modelValue', { ...props.modelValue, ...partial })
}

function setCanasta(type: CanastaType, value: number) {
  patch({ canastas: { ...props.modelValue.canastas, [type]: value } })
}

function setCanastaEnMano(type: CanastaType, value: number) {
  patch({ canastasEnMano: { ...props.modelValue.canastasEnMano, [type]: value } })
}

function setHandPoints(playerId: string, value: number) {
  patch({ handPoints: { ...props.modelValue.handPoints, [playerId]: value } })
}

function checked(event: Event): boolean {
  return (event.target as HTMLInputElement).checked
}

function numberFrom(event: Event): number {
  const value = Number((event.target as HTMLInputElement).value)
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0
}
</script>

<template>
  <div class="rounded-2xl border border-rose/40 bg-linen p-5">
    <h3 class="mb-3 font-display text-lg text-walnut">
      {{ teamLabel }}
    </h3>

    <label class="flex min-h-11 items-center gap-3 py-2 text-sm text-walnut">
      <input
        type="checkbox"
        class="h-5 w-5 rounded border-rose/60 text-wine accent-wine"
        :checked="modelValue.exactCut"
        @change="patch({ exactCut: checked($event) })"
      >
      {{ t('roundEntry.exactCutLabel') }}
    </label>
    <label class="flex min-h-11 items-center gap-3 py-2 text-sm text-walnut">
      <input
        type="checkbox"
        class="h-5 w-5 rounded border-rose/60 text-wine accent-wine"
        :checked="modelValue.misdeal"
        @change="patch({ misdeal: checked($event) })"
      >
      {{ t('roundEntry.misdealLabel', { points: penaltyValue }) }}
    </label>

    <div class="flex items-center justify-between py-2">
      <label class="text-sm text-walnut">{{ t('roundEntry.badMeldsLabel', { points: penaltyValue }) }}</label>
      <input
        type="number"
        inputmode="numeric"
        min="0"
        class="w-16 rounded-lg border border-rose/40 bg-ivory py-2 text-center text-base text-walnut focus:border-wine focus:outline-none focus:ring-1 focus:ring-wine/30"
        :value="modelValue.badMelds"
        @input="patch({ badMelds: numberFrom($event) })"
      >
    </div>
    <div class="flex items-center justify-between py-2">
      <label class="text-sm text-walnut">{{ t('roundEntry.tableTalkLabel', { points: penaltyValue }) }}</label>
      <input
        type="number"
        inputmode="numeric"
        min="0"
        class="w-16 rounded-lg border border-rose/40 bg-ivory py-2 text-center text-base text-walnut focus:border-wine focus:outline-none focus:ring-1 focus:ring-wine/30"
        :value="modelValue.tableTalk"
        @input="patch({ tableTalk: numberFrom($event) })"
      >
    </div>

    <div class="flex items-center justify-between py-2">
      <label class="text-sm text-walnut">{{ t('roundEntry.honorsLabel') }}</label>
      <input
        type="number"
        inputmode="numeric"
        min="0"
        class="w-16 rounded-lg border border-rose/40 bg-ivory py-2 text-center text-base text-walnut focus:border-wine focus:outline-none focus:ring-1 focus:ring-wine/30"
        :value="modelValue.honors"
        @input="patch({ honors: numberFrom($event) })"
      >
    </div>

    <label class="flex min-h-11 items-center gap-3 py-2 text-sm text-walnut">
      <input
        type="checkbox"
        class="h-5 w-5 rounded border-rose/60 text-wine accent-wine"
        :checked="modelValue.wentOut"
        @change="patch({ wentOut: checked($event) })"
      >
      {{ t('roundEntry.wentOutLabel') }}
    </label>
    <label class="flex min-h-11 items-center gap-3 py-2 text-sm text-walnut">
      <input
        type="checkbox"
        class="h-5 w-5 rounded border-rose/60 text-wine accent-wine"
        :checked="modelValue.blackThreesBonus"
        @change="patch({ blackThreesBonus: checked($event) })"
      >
      {{ t('roundEntry.blackThreesBonusLabel') }}
    </label>

    <div class="mt-3 border-t border-rose/30 pt-3">
      <CanastaCounterPair
        v-for="type in ALL_CANASTA_TYPES"
        :key="type"
        :label="t(`game.canastaType.${type}`)"
        :base="modelValue.canastas[type]"
        :en-mano="modelValue.canastasEnMano[type]"
        @update:base="setCanasta(type, $event)"
        @update:en-mano="setCanastaEnMano(type, $event)"
      />
    </div>

    <div class="mt-3 border-t border-rose/30 pt-3">
      <div class="flex items-center justify-between py-2">
        <label class="text-sm text-walnut">{{ t('roundEntry.meldedPointsLabel') }}</label>
        <input
          type="number"
          inputmode="numeric"
          min="0"
          class="w-20 rounded-lg border border-rose/40 bg-ivory py-2 text-center text-base text-walnut focus:border-wine focus:outline-none focus:ring-1 focus:ring-wine/30"
          :value="modelValue.meldedPoints"
          @input="patch({ meldedPoints: numberFrom($event) })"
        >
      </div>
      <p class="text-xs text-clay">
        {{ t('roundEntry.meldedPointsHint') }}
      </p>
    </div>

    <div class="mt-3 border-t border-rose/30 pt-3">
      <div
        v-for="player in players"
        :key="player.id"
        class="flex items-center justify-between py-2"
      >
        <label class="text-sm text-walnut">{{ t('roundEntry.handPointsLabel', { player: player.name }) }}</label>
        <input
          type="number"
          inputmode="numeric"
          min="0"
          class="w-20 rounded-lg border border-rose/40 bg-ivory py-2 text-center text-base text-walnut focus:border-wine focus:outline-none focus:ring-1 focus:ring-wine/30"
          :value="modelValue.handPoints[player.id] ?? 0"
          @input="setHandPoints(player.id, numberFrom($event))"
        >
      </div>
    </div>
  </div>
</template>
