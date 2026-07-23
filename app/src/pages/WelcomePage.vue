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
      <h1 class="text-3xl font-bold">
        Anota Canaston
      </h1>
      <p class="text-neutral-600">
        {{ t('welcome.tagline') }}
      </p>
    </div>

    <section class="w-full rounded-xl border border-neutral-200 bg-white p-6">
      <h2 class="text-lg font-semibold">
        {{ t('welcome.offlineTitle') }}
      </h2>
      <p class="mt-1 text-sm text-neutral-600">
        {{ t('welcome.offlineBody') }}
      </p>
      <BaseButton
        class="mt-4 w-full"
        @click="continueOffline"
      >
        {{ t('welcome.continueOffline') }}
      </BaseButton>
    </section>

    <section class="w-full rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6">
      <div class="flex items-center justify-center gap-2">
        <h2 class="text-lg font-semibold text-neutral-700">
          {{ t('welcome.cloudTitle') }}
        </h2>
        <span class="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
          {{ t('welcome.comingSoon') }}
        </span>
      </div>
      <p class="mt-1 text-sm text-neutral-600">
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
