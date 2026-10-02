<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAccountStore } from '../stores/account'
import { signInWithGoogle } from '../lib/auth'
import BaseButton from '../components/BaseButton.vue'
import logo from '../assets/images/logo-color.svg'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const account = useAccountStore()

const signingIn = ref(false)
const signInError = ref(false)

function redirectTarget(): string {
  const redirect = route.query.redirect
  // In-app paths only — anything else (or absent) falls back to home.
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    ? redirect
    : '/'
}

function continueOffline() {
  account.continueOffline()
  router.replace(redirectTarget())
}

async function signIn() {
  if (signingIn.value) return
  signingIn.value = true
  signInError.value = false
  try {
    await signInWithGoogle()
    // registerAuth()'s onAuthStateChanged flips the store into signedIn mode.
    router.replace(redirectTarget())
  } catch {
    signInError.value = true
  } finally {
    signingIn.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-md flex-col items-center gap-8 pt-6 text-center">
    <div class="flex flex-col items-center gap-3">
      <img
        :src="logo"
        alt="Anota Canaston"
        class="h-24 w-24"
      >
      <h1 class="font-display text-3xl text-walnut">
        Anota Canaston
      </h1>
      <p class="text-clay">
        {{ t('welcome.tagline') }}
      </p>
    </div>

    <section class="w-full rounded-2xl border border-rose/40 bg-linen p-6 shadow-sm shadow-walnut/5">
      <h2 class="font-display text-lg text-walnut">
        {{ t('welcome.offlineTitle') }}
      </h2>
      <p class="mt-1 text-sm text-clay">
        {{ t('welcome.offlineBody') }}
      </p>
      <BaseButton
        class="mt-4 w-full"
        @click="continueOffline"
      >
        {{ t('welcome.continueOffline') }}
      </BaseButton>
    </section>

    <section class="w-full rounded-2xl border border-dashed border-rose/60 bg-ivory p-6">
      <h2 class="font-display text-lg text-clay">
        {{ t('welcome.cloudTitle') }}
      </h2>
      <p class="mt-1 text-sm text-clay">
        {{ t('welcome.cloudBody') }}
      </p>
      <BaseButton
        class="mt-4 w-full"
        :disabled="signingIn"
        @click="signIn"
      >
        {{ signingIn ? t('account.signingIn') : t('account.signIn') }}
      </BaseButton>
      <p
        v-if="signInError"
        class="mt-2 text-sm text-wine"
      >
        {{ t('account.signInError') }}
      </p>
    </section>
  </div>
</template>
