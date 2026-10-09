<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../stores/settings'
import { useAccountStore } from '../stores/account'
import { useMembershipStore } from '../stores/membership'
import { useClubModal } from '../composables/useClubModal'
import { useAccountActions } from '../composables/useAccountActions'
import { openBillingPortal } from '../lib/billing'
import { ALL_CANASTA_TYPES } from '../domain/constants'
import { cloneRules, DEFAULT_RULES } from '../domain/rules'
import type { CanastaType, HouseRules, SessionScoringMethod } from '../domain/types'
import BaseButton from '../components/BaseButton.vue'

const { t, d } = useI18n()
const settingsStore = useSettingsStore()
const account = useAccountStore()
const membership = useMembershipStore()
const { open: openClub } = useClubModal()
const { busy: accountBusy, error: accountError, signOut, deleteAccount } = useAccountActions()

const billingBusy = ref(false)
const billingError = ref<string | null>(null)

async function manageSubscription() {
  billingBusy.value = true
  billingError.value = null
  try {
    await openBillingPortal() // redirects away on success
  } catch {
    billingError.value = t('account.manageBillingError')
    billingBusy.value = false
  }
}

const clubStatusText = computed(() => {
  if (membership.status === 'checking') return t('club.settingsChecking')
  return membership.capabilities.canSync ? t('club.settingsActive') : t('club.settingsInactive')
})

// Edit a draft so half-typed values never leak into new sessions.
const draft = ref<HouseRules>(cloneRules(settingsStore.houseRules))
const saved = ref(false)
const dirty = ref(false)

// A member's rules can arrive from the cloud after this page opened — take
// them, unless the user is mid-edit.
watch(
  () => settingsStore.houseRules,
  (rules) => {
    if (!dirty.value) draft.value = cloneRules(rules)
  },
)

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

function edited() {
  saved.value = false
  dirty.value = true
}

function setCanastaValue(type: CanastaType, event: Event) {
  draft.value.canastaValues[type] = numberFrom(event)
  edited()
}

function setField(key: NumericRuleKey, event: Event) {
  draft.value[key] = numberFrom(event)
  edited()
}

function setScoring(method: SessionScoringMethod) {
  draft.value.sessionScoring = method
  edited()
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
  dirty.value = false
}

function restoreDefaults() {
  draft.value = cloneRules(DEFAULT_RULES)
  edited()
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

    <section class="rounded-2xl border border-gold/30 bg-gold-light p-4">
      <h2 class="font-display text-lg text-walnut">
        {{ t('club.settingsTitle') }}
      </h2>
      <p class="mt-1 text-sm text-clay">
        {{ clubStatusText }}
      </p>
      <p
        v-if="membership.memberSince || membership.renewsAt || membership.endsAt"
        class="mt-1 text-xs text-clay"
      >
        <span v-if="membership.memberSince">{{ t('club.memberSince', { date: d(new Date(membership.memberSince), 'short') }) }}</span>
        <span v-if="membership.capabilities.canSync && membership.renewsAt"> · {{ t('club.renewsOn', { date: d(new Date(membership.renewsAt), 'short') }) }}</span>
        <span v-if="membership.capabilities.canSync && membership.endsAt"> · {{ t('club.endsOn', { date: d(new Date(membership.endsAt), 'short') }) }}</span>
      </p>
      <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <BaseButton
          v-if="membership.capabilities.canSubscribe"
          @click="openClub"
        >
          {{ t('club.seeBenefits') }}
        </BaseButton>
        <BaseButton
          v-if="membership.capabilities.canManageBilling"
          :variant="membership.capabilities.canSubscribe ? 'secondary' : 'primary'"
          :disabled="billingBusy"
          @click="manageSubscription"
        >
          {{ t('account.manageBilling') }}
        </BaseButton>
        <button
          v-if="account.isSignedIn"
          type="button"
          class="min-h-11 text-sm font-medium text-clay transition-colors hover:text-walnut hover:underline"
          :disabled="accountBusy"
          @click="signOut"
        >
          {{ t('account.signOut') }}
        </button>
      </div>
      <p
        v-if="accountError || billingError"
        class="mt-2 text-sm text-wine"
      >
        {{ accountError ?? billingError }}
      </p>
      <button
        v-if="account.isSignedIn"
        type="button"
        class="mt-4 min-h-11 text-sm font-medium text-wine transition-colors hover:underline"
        :disabled="accountBusy"
        @click="deleteAccount"
      >
        {{ t('account.deleteAccount') }}
      </button>
      <RouterLink
        to="/privacy"
        class="mt-2 block text-xs text-clay hover:text-walnut hover:underline"
      >
        {{ t('privacy.title') }}
      </RouterLink>
    </section>
  </div>
</template>
