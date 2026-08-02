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
    <h1 class="mb-5 font-display text-2xl text-walnut">
      {{ t('about.title') }}
    </h1>

    <p
      v-if="loading"
      class="text-clay"
    >
      {{ t('common.loading') }}
    </p>
    <p
      v-else-if="error"
      class="font-medium text-wine"
    >
      {{ t('common.error') }}: {{ error }}
    </p>
    <div
      v-else-if="data?.ok"
      class="rounded-2xl border border-sage/30 bg-sage-light p-5 text-sage"
    >
      <p class="font-medium">{{ t('about.healthy') }}</p>
      <p class="mt-1 text-xs opacity-80">
        {{ data.ts }}
      </p>
    </div>

    <BaseButton
      class="mt-5"
      variant="secondary"
      @click="execute"
    >
      {{ t('about.checkHealth') }}
    </BaseButton>
  </div>
</template>
