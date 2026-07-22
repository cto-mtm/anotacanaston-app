<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="text-center">
    <h1 class="mb-2 text-2xl font-bold">{{ t('notFound.title') }}</h1>
    <p class="mb-4 text-neutral-600">{{ t('notFound.message') }}</p>
    <RouterLink to="/" class="text-indigo-600 hover:underline">{{ t('notFound.homeLink') }}</RouterLink>
  </div>
</template>
