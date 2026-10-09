<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const SECTIONS = ['device', 'account', 'cloud', 'payments', 'deletion', 'sharing'] as const
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <div>
      <h1 class="font-display text-2xl text-walnut">
        {{ t('privacy.title') }}
      </h1>
      <p class="mt-1 text-xs text-clay">
        {{ t('privacy.updated') }}
      </p>
    </div>
    <section
      v-for="key in SECTIONS"
      :key="key"
    >
      <h2 class="mb-1 font-display text-lg text-walnut">
        {{ t(`privacy.sections.${key}.title`) }}
      </h2>
      <p class="text-sm text-clay">
        {{ t(`privacy.sections.${key}.body`) }}
      </p>
    </section>
  </div>
</template>
