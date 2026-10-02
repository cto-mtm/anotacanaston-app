<script setup lang="ts">
// Account status + Club upgrade banner shown on the home screen.
//   - offline user  → nothing (they chose the free tier; no nagging here)
//   - signed in, not entitled → upgrade CTA (web only; native shows a note)
//   - signed in + entitled → sync-active status + sign out
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Capacitor } from '@capacitor/core'
import { useAccountStore } from '../stores/account'
import { signOutCloud } from '../lib/auth'
import { startClubCheckout } from '../lib/billing'
import BaseButton from './BaseButton.vue'

const { t } = useI18n()
const account = useAccountStore()

const isNative = Capacitor.isNativePlatform()
const starting = ref(false)
const error = ref(false)

const displayName = computed(() => account.user?.displayName ?? account.user?.email ?? '')

async function upgrade() {
  if (starting.value) return
  starting.value = true
  error.value = false
  try {
    await startClubCheckout() // redirects away on success
  } catch {
    error.value = true
    starting.value = false
  }
}

async function signOut() {
  await signOutCloud()
}
</script>

<template>
  <!-- Signed in + entitled: sync active -->
  <section
    v-if="account.cloudSyncEnabled"
    class="mb-6 flex items-center justify-between rounded-2xl border border-sage/40 bg-sage-light px-4 py-3"
  >
    <div>
      <p class="text-sm font-medium text-sage">
        {{ t('account.syncOn') }}
      </p>
      <p class="text-xs text-clay">
        {{ t('account.signedInAs', { name: displayName }) }}
      </p>
    </div>
    <button
      type="button"
      class="text-sm font-medium text-wine transition-colors hover:text-walnut hover:underline"
      @click="signOut"
    >
      {{ t('account.signOut') }}
    </button>
  </section>

  <!-- Signed in, not entitled: upgrade CTA -->
  <section
    v-else-if="account.isSignedIn"
    class="mb-6 rounded-2xl border border-gold/30 bg-gold-light p-5"
  >
    <h2 class="font-display text-lg text-walnut">
      {{ t('account.upgradeTitle') }}
    </h2>
    <p class="mt-1 text-sm text-clay">
      {{ t('account.upgradeBody') }}
    </p>

    <div
      v-if="!isNative"
      class="mt-4 flex items-center gap-3"
    >
      <BaseButton
        :disabled="starting"
        @click="upgrade"
      >
        {{ starting ? t('account.upgradeStarting') : t('account.upgradeCta') }}
      </BaseButton>
      <span class="text-sm font-medium text-gold">{{ t('account.upgradePrice') }}</span>
    </div>
    <p
      v-else
      class="mt-4 text-sm text-clay"
    >
      {{ t('account.upgradeWebOnly') }}
    </p>

    <p
      v-if="error"
      class="mt-2 text-sm text-wine"
    >
      {{ t('account.upgradeError') }}
    </p>

    <button
      type="button"
      class="mt-3 text-xs font-medium text-clay transition-colors hover:text-walnut hover:underline"
      @click="signOut"
    >
      {{ t('account.signOut') }}
    </button>
  </section>
</template>
