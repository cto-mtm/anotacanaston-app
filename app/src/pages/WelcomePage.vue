<script setup lang="ts">
// First-launch choice. Club is presented first and recommended — with what it
// actually does and its price — and the free tier stays a real, clearly
// labelled option with its one limit stated plainly. On the native apps
// (no sign-in or purchase yet) free is the primary action instead.
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Capacitor } from '@capacitor/core'
import { useAccountStore } from '../stores/account'
import { useMembershipStore } from '../stores/membership'
import { signInWithGoogle } from '../lib/auth'
import { useClubModal } from '../composables/useClubModal'
import { useClubPrice } from '../composables/useClubPrice'
import { useClubCheckout } from '../composables/useClubCheckout'
import BaseButton from '../components/BaseButton.vue'
import WeaveWatermark from '../components/WeaveWatermark.vue'
import BasketIcon from '../components/icons/BasketIcon.vue'
import DevicesIcon from '../components/icons/DevicesIcon.vue'
import logo from '../assets/images/logo-color-256.webp'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const account = useAccountStore()
const membership = useMembershipStore()
const { open: openClub } = useClubModal()
const { label: priceLabel, load: loadPrice } = useClubPrice()
const { busy: checkoutBusy, error: checkoutError, alreadyMember, subscribe } = useClubCheckout()

const signingIn = ref(false)
const signInError = ref(false)
// Google sign-in is a browser popup, which doesn't work inside the native
// shells yet (needs a native auth plugin) — and the stores forbid selling
// there — so the apps lead with the free option.
const isNative = Capacitor.isNativePlatform()
const isMember = computed(() => membership.capabilities.canSync || alreadyMember.value)

onMounted(() => {
  if (!isNative) void loadPrice()
})

// Signing in from anywhere on this page (including the Club modal) moves on —
// except mid-"Join Club", which goes on to Stripe Checkout instead.
// Not immediate: a signed-in user may open this page on purpose.
watch(
  () => account.isSignedIn,
  (signedIn) => {
    if (signedIn && !checkoutBusy.value) router.replace(redirectTarget())
  },
)
// An existing member who tapped "Join Club" (e.g. on a new device): no checkout, just go in.
watch(alreadyMember, (member) => {
  if (member) router.replace(redirectTarget())
})

function redirectTarget(): string {
  const redirect = route.query.redirect
  // In-app paths only — anything else (or absent) falls back to home.
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    ? redirect
    : '/'
}

function continueFree() {
  // Already signed in (e.g. checkout failed or was skipped): keep the account, just go in.
  if (!account.isSignedIn) account.continueOffline()
  router.replace(redirectTarget())
}

async function signIn() {
  if (signingIn.value) return
  signingIn.value = true
  signInError.value = false
  try {
    await signInWithGoogle()
    // registerAuth()'s onAuthStateChanged flips the store into signedIn mode,
    // and the watcher above navigates on.
  } catch {
    signInError.value = true
  } finally {
    signingIn.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-md flex-col items-center gap-6 pt-6 pb-4 text-center">
    <WeaveWatermark />

    <div class="flex flex-col items-center gap-3">
      <img
        :src="logo"
        alt="Anota Canaston"
        class="h-24 w-24"
      >
      <h1 class="font-display text-3xl text-walnut">
        Anota Canaston
      </h1>
      <div
        class="weave-band w-24"
        aria-hidden="true"
      />
      <p class="text-clay">
        {{ t('welcome.tagline') }}
      </p>
    </div>

    <!-- Club: the recommended path -->
    <section
      class="relative order-2 w-full rounded-2xl border-2 border-wine/30 bg-ivory p-6 text-left shadow-sm shadow-walnut/5"
    >
      <span
        v-if="!isNative && !isMember"
        class="absolute -top-3 left-5 rounded-full bg-wine px-3 py-0.5 text-xs font-semibold text-white"
      >
        {{ t('welcome.clubBadge') }}
      </span>
      <h2 class="font-display text-xl text-walnut">
        {{ t('welcome.clubTitle') }}
      </h2>
      <p class="mt-1 text-clay">
        {{ t('welcome.clubPitch') }}
      </p>

      <ul class="mt-4 space-y-3 text-sm text-walnut">
        <li class="flex items-start gap-3">
          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-wine-light text-wine"
            aria-hidden="true"
          >
            <BasketIcon class="h-5 w-5" />
          </span>
          <span class="pt-1.5">{{ t('welcome.clubBackup') }}</span>
        </li>
        <li class="flex items-start gap-3">
          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage-light text-sage"
            aria-hidden="true"
          >
            <DevicesIcon class="h-5 w-5" />
          </span>
          <span class="pt-1.5">{{ t('welcome.clubDevices') }}</span>
        </li>
      </ul>
      <p class="mt-3 text-xs text-clay">
        {{ t('welcome.clubSoon') }}
      </p>

      <p
        v-if="isMember"
        class="mt-5 rounded-xl bg-sage-light px-4 py-3 text-center text-sm font-medium text-sage"
      >
        {{ t('club.alreadyMember') }}
      </p>
      <p
        v-else-if="isNative"
        class="mt-5 text-sm text-clay"
      >
        {{ t('welcome.nativeClub') }}
      </p>
      <template v-else>
        <p
          v-if="priceLabel"
          class="mt-5 text-center"
        >
          <span class="font-display text-xl text-walnut">{{ priceLabel }}</span>
          <span class="block text-xs text-clay">{{ t('club.cancelAnytime') }}</span>
        </p>
        <BaseButton
          class="mt-3 w-full"
          :disabled="checkoutBusy || signingIn"
          @click="subscribe"
        >
          {{ checkoutBusy ? t('club.starting') : t('welcome.clubJoin') }}
        </BaseButton>
        <!-- Shortcut for someone at the table who just wants to start: the
             free card sits below the fold on phones. Quieter than the CTA. -->
        <button
          type="button"
          class="mt-1 min-h-11 w-full text-sm text-clay underline decoration-rose underline-offset-4 transition-colors hover:text-walnut"
          :disabled="checkoutBusy"
          @click="continueFree"
        >
          {{ account.isSignedIn ? t('welcome.freeQuickSignedIn') : t('welcome.freeQuick') }}
        </button>
        <p
          v-if="checkoutError"
          class="mt-2 text-center text-sm text-wine"
        >
          {{ t('club.error') }}
        </p>
      </template>

      <div class="mt-3 flex flex-col items-center gap-1 text-sm">
        <button
          type="button"
          class="min-h-11 font-medium text-wine transition-colors hover:text-walnut hover:underline"
          @click="openClub"
        >
          {{ t('club.seeBenefits') }}
        </button>
        <p
          v-if="!isNative && !account.isSignedIn"
          class="text-clay"
        >
          {{ t('welcome.alreadyMember') }}
          <button
            type="button"
            class="min-h-11 font-medium text-wine transition-colors hover:text-walnut hover:underline"
            :disabled="signingIn || checkoutBusy"
            @click="signIn"
          >
            {{ signingIn ? t('account.signingIn') : t('welcome.signInLink') }}
          </button>
        </p>
        <p
          v-if="signInError"
          class="text-wine"
        >
          {{ t('account.signInError') }}
        </p>
      </div>
    </section>

    <div
      class="order-3 flex w-full items-center gap-3 text-sm text-clay"
      aria-hidden="true"
    >
      <span class="h-px flex-1 bg-rose/60" />
      {{ t('welcome.or') }}
      <span class="h-px flex-1 bg-rose/60" />
    </div>

    <!-- Free: a real option, its one limit stated plainly -->
    <section
      class="w-full rounded-2xl border border-rose/40 bg-linen p-6 text-left"
      :class="isNative ? 'order-1' : 'order-4'"
    >
      <h2 class="font-display text-lg text-walnut">
        {{ t('welcome.freeTitle') }}
      </h2>
      <p class="mt-1 text-sm text-walnut">
        {{ t('welcome.freeBody') }}
      </p>
      <p class="mt-1 text-sm text-clay">
        {{ t('welcome.freeLimit') }}
      </p>
      <BaseButton
        class="mt-4 w-full"
        :variant="isNative ? 'primary' : 'secondary'"
        :disabled="checkoutBusy"
        @click="continueFree"
      >
        {{ account.isSignedIn ? t('welcome.freeContinue') : t('welcome.freeStart') }}
      </BaseButton>
    </section>

    <RouterLink
      to="/privacy"
      class="order-5 text-xs text-clay hover:text-walnut hover:underline"
    >
      {{ t('privacy.title') }}
    </RouterLink>
  </div>
</template>
