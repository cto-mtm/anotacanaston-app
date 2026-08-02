<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="text-center">
    <h1 class="mb-2 font-display text-2xl text-walnut">
      {{ t('notFound.title') }}
    </h1>
    <p class="mb-4 text-clay">
      {{ t('notFound.message') }}
    </p>
    <RouterLink
      to="/"
      class="text-sm font-medium text-wine transition-colors hover:text-walnut hover:underline"
    >
      {{ t('notFound.homeLink') }}
    </RouterLink>
  </div>
</template>
