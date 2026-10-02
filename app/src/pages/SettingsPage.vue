<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../stores/settings'
import { ALL_CANASTA_TYPES } from '../domain/constants'
import { cloneRules, DEFAULT_RULES } from '../domain/rules'
import type { CanastaType, HouseRules, SessionScoringMethod } from '../domain/types'
import BaseButton from '../components/BaseButton.vue'

const { t } = useI18n()
const settingsStore = useSettingsStore()

// Edit a draft so half-typed values never leak into new sessions.
const draft = ref<HouseRules>(cloneRules(settingsStore.houseRules))
const saved = ref(false)

type NumericRuleKey = Exclude<keyof HouseRules, 'canastaValues' | 'sessionScoring'>

const BONUS_FIELDS: Array<{ key: NumericRuleKey; labelKey: string }> = [
  { key: 'canastonThreshold', labelKey: 'settings.canastonThreshold' },
  { key: 'canastonBonus', labelKey: 'settings.canastonBonus' },
  { key: 'superCanastonThreshold', labelKey: 'settings.superCanastonThreshold' },
  { key: 'superCanastonBonus', labelKey: 'settings.superCanastonBonus' },
]

const GAME_FIELDS: Array<{ key: NumericRuleKey; labelKey: string }> = [
  { key: 'penaltyValue', labelKey: 'settings.penaltyValue' },
  { key: 'gameTarget', labelKey: 'settings.gameTarget' },
]

const SCORING_METHODS: SessionScoringMethod[] = ['roundedThousands', 'rawPoints']

function numberFrom(event: Event): number {
  const value = Number((event.target as HTMLInputElement).value)
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0
}

function setCanastaValue(type: CanastaType, event: Event) {
  draft.value.canastaValues[type] = numberFrom(event)
  saved.value = false
}

function setField(key: NumericRuleKey, event: Event) {
  draft.value[key] = numberFrom(event)
  saved.value = false
}

function setScoring(method: SessionScoringMethod) {
  draft.value.sessionScoring = method
  saved.value = false
}

const thresholdsValid = computed(
  () =>
    draft.value.canastonThreshold > 0 &&
    draft.value.superCanastonThreshold > draft.value.canastonThreshold &&
    draft.value.gameTarget > 0,
)

function save() {
  if (!thresholdsValid.value) return
  settingsStore.setHouseRules(draft.value)
  saved.value = true
}

function restoreDefaults() {
  draft.value = cloneRules(DEFAULT_RULES)
  saved.value = false
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-8">
    <div>
      <h1 class="font-display text-2xl text-walnut">
        {{ t('settings.title') }}
      </h1>
      <p class="mt-1 text-sm text-clay">
        {{ t('settings.intro') }}
      </p>
    </div>

    <section>
      <h2 class="mb-3 font-display text-lg text-walnut">
        {{ t('settings.canastaValuesTitle') }}
      </h2>
      <div class="rounded-xl border border-rose/40 bg-linen px-4 py-1">
        <label
          v-for="type in ALL_CANASTA_TYPES"
          :key="type"
          class="flex items-center justify-between gap-3 border-t border-rose/20 py-2 text-sm text-walnut first:border-t-0"
        >
          {{ t(`game.canastaType.${type}`) }}
          <input
            type="number"
            inputmode="numeric"
            min="0"
            step="100"
            class="w-24 rounded-lg border border-rose/40 bg-ivory py-2 text-center text-base text-walnut focus:border-wine focus:outline-none focus:ring-1 focus:ring-wine/30"
            :value="draft.canastaValues[type]"
            @input="setCanastaValue(type, $event)"
          >
        </label>
      </div>
    </section>

    <section>
      <h2 class="mb-3 font-display text-lg text-walnut">
        {{ t('settings.bonusesTitle') }}
      </h2>
      <div class="rounded-xl border border-rose/40 bg-linen px-4 py-1">
        <label
          v-for="field in BONUS_FIELDS"
          :key="field.key"
          class="flex items-center justify-between gap-3 border-t border-rose/20 py-2 text-sm text-walnut first:border-t-0"
        >
          {{ t(field.labelKey) }}
          <input
            type="number"
            inputmode="numeric"
            min="0"
            class="w-24 rounded-lg border border-rose/40 bg-ivory py-2 text-center text-base text-walnut focus:border-wine focus:outline-none focus:ring-1 focus:ring-wine/30"
            :value="draft[field.key]"
            @input="setField(field.key, $event)"
          >
        </label>
      </div>
      <p
        v-if="!thresholdsValid"
        class="mt-2 text-sm font-medium text-wine"
      >
        {{ t('settings.thresholdsInvalid') }}
      </p>
    </section>

    <section>
      <h2 class="mb-3 font-display text-lg text-walnut">
        {{ t('settings.gameTitle') }}
      </h2>
      <div class="rounded-xl border border-rose/40 bg-linen px-4 py-1">
        <label
          v-for="field in GAME_FIELDS"
          :key="field.key"
          class="flex items-center justify-between gap-3 border-t border-rose/20 py-2 text-sm text-walnut first:border-t-0"
        >
          {{ t(field.labelKey) }}
          <input
            type="number"
            inputmode="numeric"
            min="0"
            class="w-24 rounded-lg border border-rose/40 bg-ivory py-2 text-center text-base text-walnut focus:border-wine focus:outline-none focus:ring-1 focus:ring-wine/30"
            :value="draft[field.key]"
            @input="setField(field.key, $event)"
          >
        </label>
      </div>
    </section>

    <section>
      <h2 class="mb-3 font-display text-lg text-walnut">
        {{ t('settings.sessionScoringTitle') }}
      </h2>
      <div class="space-y-2">
        <label
          v-for="method in SCORING_METHODS"
          :key="method"
          class="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors"
          :class="draft.sessionScoring === method ? 'border-wine bg-wine-light' : 'border-rose/40 bg-linen'"
        >
          <input
            type="radio"
            name="sessionScoring"
            class="mt-0.5 h-5 w-5 accent-wine"
            :checked="draft.sessionScoring === method"
            @change="setScoring(method)"
          >
          <span>
            <span class="block font-medium text-walnut">{{ t(`settings.sessionScoring.${method}.label`) }}</span>
            <span class="block text-clay">{{ t(`settings.sessionScoring.${method}.body`) }}</span>
          </span>
        </label>
      </div>
    </section>

    <div class="flex flex-wrap items-center justify-between gap-4">
      <BaseButton
        variant="secondary"
        @click="restoreDefaults"
      >
        {{ t('settings.restoreDefaults') }}
      </BaseButton>
      <div class="flex items-center gap-3">
        <span
          v-if="saved"
          class="text-sm font-medium text-sage"
        >{{ t('settings.saved') }}</span>
        <BaseButton
          :disabled="!thresholdsValid"
          @click="save"
        >
          {{ t('common.save') }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>
