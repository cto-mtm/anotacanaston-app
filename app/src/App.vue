<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppShell from './components/AppShell.vue'
import ClubBenefitsModal from './components/ClubBenefitsModal.vue'
import { useSyncStore } from './stores/sync'

const { t } = useI18n()
// Pages read games, and where games live depends on who is signed in — so
// wait for Firebase's first auth state (usually instant, offline too).
const sync = useSyncStore()
</script>

<template>
  <AppShell>
    <RouterView v-if="sync.ready" />
    <p
      v-else
      class="py-16 text-center text-sm text-clay"
      role="status"
    >
      {{ t('common.loading') }}
    </p>
  </AppShell>
  <ClubBenefitsModal />
</template>
