<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAccountStore } from '../stores/account'
import BaseButton from '../components/BaseButton.vue'
import logo from '../assets/images/logo-color.svg'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const account = useAccountStore()

function continueOffline() {
  account.continueOffline()
  const redirect = route.query.redirect
  // In-app paths only — anything else (or absent) falls back to home.
  const target =
    typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
      ? redirect
      : '/'
  router.replace(target)
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
      <div class="flex items-center justify-center gap-2">
        <h2 class="font-display text-lg text-clay">
          {{ t('welcome.cloudTitle') }}
        </h2>
        <span class="rounded-full bg-wine-light px-2.5 py-0.5 text-xs font-medium text-wine">
          {{ t('welcome.comingSoon') }}
        </span>
      </div>
      <p class="mt-1 text-sm text-clay">
        {{ t('welcome.cloudBody') }}
      </p>
      <BaseButton
        class="mt-4 w-full"
        disabled
      >
        {{ t('welcome.signIn') }}
      </BaseButton>
    </section>
  </div>
</template>
