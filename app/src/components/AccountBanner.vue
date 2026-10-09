<script setup lang="ts">
// Account / storage status banner on the home screen, driven by membership:
//   member / graceful → live save state (+ "update your card" in grace)
//   lapsed            → "subscription ended, games are on this device"
//   free / offline    → snoozable Club upsell ("not backed up")
//   checking          → nothing (never flash a wrong state)
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccountStore } from '../stores/account'
import { useMembershipStore } from '../stores/membership'
import { useSessionsStore } from '../stores/sessions'
import { useSettingsStore } from '../stores/settings'
import { useSyncStore } from '../stores/sync'
import { useClubModal } from '../composables/useClubModal'
import { useAccountActions } from '../composables/useAccountActions'
import { openBillingPortal } from '../lib/billing'

const { t } = useI18n()
const account = useAccountStore()
const membership = useMembershipStore()
const sessionsStore = useSessionsStore()
const settingsStore = useSettingsStore()
const sync = useSyncStore()
const { open: openClub } = useClubModal()
const { signOut } = useAccountActions()

const displayName = computed(() => account.user?.displayName ?? account.user?.email ?? '')
const sessionCount = computed(() => sessionsStore.localSessions.length)

const SAVE_STATE_TONE = {
  saved: 'border-sage/40 bg-sage-light text-sage',
  saving: 'border-sage/40 bg-sage-light text-sage',
  offline: 'border-gold/30 bg-gold-light text-gold',
  error: 'border-wine/30 bg-wine-light text-wine',
  local: 'border-sage/40 bg-sage-light text-sage',
} as const

const upsell = computed<'noBackup' | 'offline' | null>(() => {
  if (!settingsStore.showClubBanner) return null
  if (membership.status === 'free') return 'noBackup'
  if (account.mode === 'offline' && sessionCount.value > 0) return 'offline'
  return null
})

async function updateCard() {
  try {
    await openBillingPortal() // redirects away on success
  } catch {
    alert(t('account.manageBillingError'))
  }
}
</script>

<template>
  <!-- Member: live save state -->
  <section
    v-if="membership.capabilities.canSync"
    class="mb-6 rounded-2xl border px-4 py-3"
    :class="SAVE_STATE_TONE[sync.saveState]"
  >
    <div class="flex items-center justify-between gap-3">
      <div>
        <p
          class="text-sm font-medium"
          role="status"
        >
          {{ t(`club.saveState.${sync.saveState}`) }}
        </p>
        <p class="text-xs text-clay">
          {{ t('account.signedInAs', { name: displayName }) }}
        </p>
      </div>
      <button
        type="button"
        class="min-h-11 text-sm font-medium text-wine transition-colors hover:text-walnut hover:underline"
        @click="signOut"
      >
        {{ t('account.signOut') }}
      </button>
    </div>
    <div
      v-if="membership.capabilities.needsCardUpdate"
      class="mt-3 border-t border-current/20 pt-3"
    >
      <p class="text-sm text-walnut">
        {{ t('club.cardFailed') }}
      </p>
      <button
        v-if="membership.capabilities.canManageBilling"
        type="button"
        class="mt-2 min-h-11 rounded-xl bg-wine px-4 py-2 text-sm font-semibold text-white"
        @click="updateCard"
      >
        {{ t('club.updateCard') }}
      </button>
    </div>
  </section>

  <!-- Subscription ended -->
  <section
    v-else-if="membership.status === 'lapsed'"
    class="mb-6 rounded-2xl border border-gold/30 bg-gold-light p-4"
  >
    <p class="font-medium text-walnut">
      {{ t('club.lapsedTitle') }}
    </p>
    <p class="mt-0.5 text-sm text-clay">
      {{ t('club.lapsedBody') }}
    </p>
    <button
      type="button"
      class="mt-3 min-h-11 rounded-xl bg-wine px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-wine/20 transition-all hover:bg-wine/90 active:scale-[0.97]"
      @click="openClub"
    >
      {{ t('club.resubscribe') }}
    </button>
  </section>

  <!-- Not backed up: offline device, or signed in without Club -->
  <section
    v-else-if="upsell"
    class="mb-6 rounded-2xl border border-gold/30 bg-gold-light p-4"
  >
    <p class="font-medium text-walnut">
      {{ upsell === 'offline' ? t('club.bannerOffline', sessionCount) : t('club.bannerNoBackup') }}
    </p>
    <p class="mt-0.5 text-sm text-clay">
      {{ upsell === 'offline' ? t('club.bannerOfflineBody') : t('club.bannerNoBackupBody') }}
    </p>
    <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <button
        type="button"
        class="min-h-11 rounded-xl bg-wine px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-wine/20 transition-all hover:bg-wine/90 active:scale-[0.97]"
        @click="openClub"
      >
        {{ t('club.seeClub') }}
      </button>
      <button
        type="button"
        class="min-h-11 text-sm font-medium text-clay transition-colors hover:text-walnut hover:underline"
        @click="settingsStore.dismissClubBanner"
      >
        {{ t('club.notNow') }}
      </button>
      <button
        v-if="account.isSignedIn"
        type="button"
        class="ml-auto min-h-11 text-xs font-medium text-clay transition-colors hover:text-walnut hover:underline"
        @click="signOut"
      >
        {{ t('account.signOut') }}
      </button>
    </div>
  </section>
</template>
