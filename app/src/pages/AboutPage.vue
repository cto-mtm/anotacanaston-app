<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useApi } from '../composables/useApi'
import BaseButton from '../components/BaseButton.vue'

interface HealthResponse {
  ok: boolean
  ts: string
}

const { t } = useI18n()
const { data, error, loading, execute } = useApi<HealthResponse>('/health')

onMounted(execute)
</script>

<template>
  <div>
    <h1 class="mb-4 text-2xl font-bold">{{ t('about.title') }}</h1>

    <p v-if="loading">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="text-red-600">{{ t('common.error') }}: {{ error }}</p>
    <div v-else-if="data?.ok" class="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
      <p>{{ t('about.healthy') }}</p>
      <p class="mt-1 text-xs text-green-600">{{ data.ts }}</p>
    </div>

    <BaseButton class="mt-4" @click="execute">{{ t('about.checkHealth') }}</BaseButton>
  </div>
</template>
