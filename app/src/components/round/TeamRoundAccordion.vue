<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import RoundSection from './RoundSection.vue'
import CountStepper from './CountStepper.vue'
import CardPointsInput from './CardPointsInput.vue'
import { ALL_CANASTA_TYPES } from '../../domain/constants'
import type { RoundScoreBreakdown } from '../../domain/scoring'
import type { CanastaType, CardCounts, HouseRules, Player, TeamId, TeamRoundEntry } from '../../domain/types'
import { useRoundLines, type RoundSectionKey } from '../../composables/useRoundLines'

const props = defineProps<{
  modelValue: TeamRoundEntry
  team: TeamId
  players: Player[]
  rules: HouseRules
  breakdown: RoundScoreBreakdown
  maxHonors: number
  openSection: RoundSectionKey | null
  activePlayerIndex: number
  isVisited: (section: RoundSectionKey) => boolean
}>()
const emit = defineEmits<{
  'update:modelValue': [value: TeamRoundEntry]
  toggle: [section: RoundSectionKey]
  selectPlayer: [index: number]
}>()
const { t, n } = useI18n()
const { sectionLines, extrasCount, formatPoints } = useRoundLines()

const lines = computed(() => sectionLines(props.modelValue, props.breakdown, props.players))

function state(section: RoundSectionKey): 'open' | 'done' | 'todo' {
  if (props.openSection === section) return 'open'
  return props.isVisited(section) ? 'done' : 'todo'
}

function sectionId(section: RoundSectionKey) {
  return `round-${props.team}-${section}`
}

function patch(partial: Partial<TeamRoundEntry>) {
  emit('update:modelValue', { ...props.modelValue, ...partial })
}

function setCanasta(type: CanastaType, value: number) {
  patch({ canastas: { ...props.modelValue.canastas, [type]: value } })
}
function setCanastaEnMano(type: CanastaType, value: number) {
  patch({ canastasEnMano: { ...props.modelValue.canastasEnMano, [type]: value } })
}

function setMelded({ points, cards }: { points: number; cards?: CardCounts }) {
  const next: TeamRoundEntry = { ...props.modelValue, meldedPoints: points }
  if (cards) next.meldedCards = cards
  else delete next.meldedCards
  emit('update:modelValue', next)
}

function setHand(playerId: string, { points, cards }: { points: number; cards?: CardCounts }) {
  const handCards = { ...(props.modelValue.handCards ?? {}) }
  if (cards) handCards[playerId] = cards
  else delete handCards[playerId]
  const next: TeamRoundEntry = { ...props.modelValue, handPoints: { ...props.modelValue.handPoints, [playerId]: points } }
  if (Object.keys(handCards).length > 0) next.handCards = handCards
  else delete next.handCards
  emit('update:modelValue', next)
}

function rowPoints(type: CanastaType): number {
  const value = props.rules.canastaValues[type]
  return props.modelValue.canastas[type] * value + props.modelValue.canastasEnMano[type] * value * 2
}

const noCanastas = computed(() => !lines.value.canastas.filled)
</script>

<template>
  <div class="space-y-2">
    <!-- Canastas -->
    <RoundSection
      :id="sectionId('canastas')"
      :title="t('roundEntry.sections.canastas')"
      :summary="lines.canastas.summary"
      :points="lines.canastas.points"
      :state="state('canastas')"
      @toggle="emit('toggle', 'canastas')"
    >
      <p class="mb-2 text-xs text-clay">
        {{ t('roundEntry.canastasHint') }}
      </p>
      <div class="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 gap-y-2">
        <span />
        <span class="text-center text-xs font-medium text-clay">{{ t('roundEntry.canastaNormal') }}</span>
        <span class="text-center text-xs font-medium text-gold">{{ t('roundEntry.canastaEnMano') }}</span>
        <template
          v-for="type in ALL_CANASTA_TYPES"
          :key="type"
        >
          <div class="min-w-0">
            <p class="text-sm leading-tight text-walnut">
              {{ t(`game.canastaType.${type}`) }}
            </p>
            <p
              class="text-xs tabular-nums"
              :class="rowPoints(type) ? 'font-semibold text-walnut' : 'text-clay'"
            >
              {{ rowPoints(type) ? formatPoints(rowPoints(type)) : t('roundEntry.perCard', { points: n(rules.canastaValues[type]) }) }}
            </p>
          </div>
          <CountStepper
            :model-value="modelValue.canastas[type]"
            :label="`${t(`game.canastaType.${type}`)} · ${t('roundEntry.canastaNormal')}`"
            @update:model-value="setCanasta(type, $event)"
          />
          <CountStepper
            :model-value="modelValue.canastasEnMano[type]"
            :label="`${t(`game.canastaType.${type}`)} · ${t('roundEntry.canastaEnMano')}`"
            tone="gold"
            @update:model-value="setCanastaEnMano(type, $event)"
          />
        </template>
      </div>
      <p
        v-if="breakdown.countBonus"
        class="mt-3 flex justify-between text-sm text-walnut"
      >
        <span>{{ t('game.countBonus') }}</span>
        <span class="font-semibold tabular-nums">{{ formatPoints(breakdown.countBonus) }}</span>
      </p>
      <p
        v-if="noCanastas"
        class="mt-3 text-xs text-gold"
      >
        {{ t('roundEntry.noCanastasWarning') }}
      </p>
    </RoundSection>

    <!-- Honors -->
    <RoundSection
      :id="sectionId('honors')"
      :title="t('roundEntry.sections.honors')"
      :summary="lines.honors.summary"
      :points="lines.honors.points"
      :state="state('honors')"
      @toggle="emit('toggle', 'honors')"
    >
      <div class="flex items-center justify-between gap-3">
        <p class="text-xs text-clay">
          {{ t('roundEntry.honorsHint', { max: maxHonors }) }}
        </p>
        <CountStepper
          :model-value="modelValue.honors"
          :label="t('roundEntry.sections.honors')"
          :max="maxHonors"
          @update:model-value="patch({ honors: $event })"
        />
      </div>
    </RoundSection>

    <!-- Melded points -->
    <RoundSection
      :id="sectionId('melded')"
      :title="t('roundEntry.sections.melded')"
      :summary="lines.melded.summary"
      :points="lines.melded.points"
      :state="state('melded')"
      @toggle="emit('toggle', 'melded')"
    >
      <p class="mb-2 text-xs text-clay">
        {{ t('roundEntry.meldedPointsHint') }}
      </p>
      <CardPointsInput
        :points="modelValue.meldedPoints"
        :cards="modelValue.meldedCards"
        :label="t('roundEntry.sections.melded')"
        @change="setMelded"
      />
    </RoundSection>

    <!-- Hand points: one player at a time, asked by name -->
    <RoundSection
      :id="sectionId('hand')"
      :title="t('roundEntry.sections.hand')"
      :summary="lines.hand.summary"
      :points="lines.hand.points"
      :state="state('hand')"
      @toggle="emit('toggle', 'hand')"
    >
      <div class="space-y-2">
        <div
          v-for="(player, index) in players"
          :key="player.id"
          class="rounded-xl border"
          :class="index === activePlayerIndex ? 'border-rose/60 bg-ivory/70' : 'border-transparent'"
        >
          <button
            type="button"
            class="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left"
            :aria-expanded="index === activePlayerIndex"
            @click="emit('selectPlayer', index)"
          >
            <span class="text-sm font-medium text-walnut">
              {{ index === activePlayerIndex ? t('roundEntry.handPrompt', { player: player.name }) : player.name }}
            </span>
            <span
              class="shrink-0 text-sm font-semibold tabular-nums"
              :class="(modelValue.handPoints[player.id] ?? 0) > 0 ? 'text-wine' : 'text-clay/60'"
            >{{ formatPoints(-(modelValue.handPoints[player.id] ?? 0)) }}</span>
          </button>
          <div
            v-if="index === activePlayerIndex"
            class="px-3 pb-3"
          >
            <CardPointsInput
              :points="modelValue.handPoints[player.id] ?? 0"
              :cards="modelValue.handCards?.[player.id]"
              :label="player.name"
              @change="setHand(player.id, $event)"
            />
          </div>
        </div>
      </div>
    </RoundSection>

    <!-- Penalties & extras: rare, so never part of the Next flow -->
    <RoundSection
      :id="sectionId('extras')"
      :title="t('roundEntry.sections.extras')"
      :summary="lines.extras.summary"
      :points="lines.extras.points"
      :badge="extrasCount(modelValue)"
      :state="openSection === 'extras' ? 'open' : lines.extras.filled ? 'done' : 'todo'"
      @toggle="emit('toggle', 'extras')"
    >
      <div class="space-y-1">
        <label class="flex min-h-11 items-center gap-3 text-sm text-walnut">
          <input
            type="checkbox"
            class="h-5 w-5 rounded accent-wine"
            :checked="modelValue.exactCut"
            @change="patch({ exactCut: ($event.target as HTMLInputElement).checked })"
          >
          {{ t('roundEntry.exactCutLabel') }}
        </label>
        <label class="flex min-h-11 items-center gap-3 text-sm text-walnut">
          <input
            type="checkbox"
            class="h-5 w-5 rounded accent-wine"
            :checked="modelValue.misdeal"
            @change="patch({ misdeal: ($event.target as HTMLInputElement).checked })"
          >
          {{ t('roundEntry.misdealLabel', { points: rules.penaltyValue }) }}
        </label>
        <div class="flex min-h-11 items-center justify-between gap-3">
          <span class="text-sm text-walnut">{{ t('roundEntry.badMeldsLabel', { points: rules.penaltyValue }) }}</span>
          <CountStepper
            :model-value="modelValue.badMelds"
            :label="t('roundEntry.badMeldsShort')"
            @update:model-value="patch({ badMelds: $event })"
          />
        </div>
        <div class="flex min-h-11 items-center justify-between gap-3">
          <span class="text-sm text-walnut">{{ t('roundEntry.tableTalkLabel', { points: rules.penaltyValue }) }}</span>
          <CountStepper
            :model-value="modelValue.tableTalk"
            :label="t('roundEntry.tableTalkShort')"
            @update:model-value="patch({ tableTalk: $event })"
          />
        </div>
      </div>
    </RoundSection>
  </div>
</template>
