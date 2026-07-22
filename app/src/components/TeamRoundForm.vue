<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import CanastaCounter from './CanastaCounter.vue'
import { ALL_CANASTA_TYPES } from '../domain/constants'
import type { CanastaType, Player, TeamRoundEntry } from '../domain/types'

const props = defineProps<{ modelValue: TeamRoundEntry; players: Player[]; teamLabel: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: TeamRoundEntry] }>()
const { t } = useI18n()

function patch(partial: Partial<TeamRoundEntry>) {
  emit('update:modelValue', { ...props.modelValue, ...partial })
}

function setCanasta(type: CanastaType, value: number) {
  patch({ canastas: { ...props.modelValue.canastas, [type]: value } })
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
  <div class="rounded-xl border border-neutral-200 bg-white p-4">
    <h3 class="mb-3 font-semibold">
      {{ teamLabel }}
    </h3>

    <label class="flex items-center gap-2 py-1 text-sm">
      <input
        type="checkbox"
        :checked="modelValue.exactCut"
        @change="patch({ exactCut: checked($event) })"
      >
      {{ t('roundEntry.exactCutLabel') }}
    </label>
    <label class="flex items-center gap-2 py-1 text-sm">
      <input
        type="checkbox"
        :checked="modelValue.misdeal"
        @change="patch({ misdeal: checked($event) })"
      >
      {{ t('roundEntry.misdealLabel') }}
    </label>

    <div class="flex items-center justify-between py-2">
      <label class="text-sm">{{ t('roundEntry.honorsLabel') }}</label>
      <input
        type="number"
        inputmode="numeric"
        min="0"
        class="w-16 rounded border border-neutral-300 text-center"
        :value="modelValue.honors"
        @input="patch({ honors: numberFrom($event) })"
      >
    </div>

    <label class="flex items-center gap-2 py-1 text-sm">
      <input
        type="checkbox"
        :checked="modelValue.wentOut"
        @change="patch({ wentOut: checked($event) })"
      >
      {{ t('roundEntry.wentOutLabel') }}
    </label>
    <label class="flex items-center gap-2 py-1 text-sm">
      <input
        type="checkbox"
        :checked="modelValue.blackThreesBonus"
        @change="patch({ blackThreesBonus: checked($event) })"
      >
      {{ t('roundEntry.blackThreesBonusLabel') }}
    </label>

    <div class="mt-3 border-t border-neutral-100 pt-2">
      <CanastaCounter
        v-for="type in ALL_CANASTA_TYPES"
        :key="type"
        :label="t(`game.canastaType.${type}`)"
        :model-value="modelValue.canastas[type]"
        @update:model-value="setCanasta(type, $event)"
      />
    </div>

    <div class="mt-3 border-t border-neutral-100 pt-2">
      <div class="flex items-center justify-between py-1">
        <label class="text-sm">{{ t('roundEntry.meldedPointsLabel') }}</label>
        <input
          type="number"
          inputmode="numeric"
          min="0"
          class="w-20 rounded border border-neutral-300 text-center"
          :value="modelValue.meldedPoints"
          @input="patch({ meldedPoints: numberFrom($event) })"
        >
      </div>
      <p class="text-xs text-neutral-500">
        {{ t('roundEntry.meldedPointsHint') }}
      </p>
    </div>

    <div class="mt-3 border-t border-neutral-100 pt-2">
      <div
        v-for="player in players"
        :key="player.id"
        class="flex items-center justify-between py-1"
      >
        <label class="text-sm">{{ t('roundEntry.handPointsLabel', { player: player.name }) }}</label>
        <input
          type="number"
          inputmode="numeric"
          min="0"
          class="w-20 rounded border border-neutral-300 text-center"
          :value="modelValue.handPoints[player.id] ?? 0"
          @input="setHandPoints(player.id, numberFrom($event))"
        >
      </div>
    </div>
  </div>
</template>
