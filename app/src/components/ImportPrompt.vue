<script setup lang="ts">
// "Hay N partidas en este dispositivo. ¿Subirlas a tu cuenta?" — shown to a
// member who has offline games on this device. Never automatic: on a borrowed
// device those games may belong to someone else.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionsStore } from '../stores/sessions'
import { useSyncStore } from '../stores/sync'
import { declineLocalImport, importLocalGames } from '../lib/sync'
import BaseButton from './BaseButton.vue'

const { t } = useI18n()
const sync = useSyncStore()
const sessions = useSessionsStore()

// Device games the account already has in the cloud (e.g. a kept copy edited
// while signed out): uploading replaces the cloud version, so say so.
const replacing = computed(() => {
  const inCloud = new Set(sessions.cloudSessions.map((s) => s.id))
  return sync.pendingImportIds.filter((id) => inCloud.has(id)).length
})
</script>

<template>
  <section
    v-if="sync.pendingImport > 0"
    class="mb-6 rounded-2xl border border-rose/40 bg-linen p-4"
  >
    <p class="font-medium text-walnut">
      {{ t('club.importTitle', sync.pendingImport) }}
    </p>
    <p class="mt-0.5 text-sm text-clay">
      {{ t('club.importBody') }}
    </p>
    <p
      v-if="replacing > 0"
      class="mt-1 text-sm font-medium text-wine"
    >
      {{ t('club.importReplaces', replacing) }}
    </p>
    <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <BaseButton @click="importLocalGames">
        {{ t('club.importYes') }}
      </BaseButton>
      <button
        type="button"
        class="min-h-11 text-sm font-medium text-clay transition-colors hover:text-walnut hover:underline"
        @click="declineLocalImport"
      >
        {{ t('club.importNo') }}
      </button>
    </div>
    <p
      v-if="sync.importFailed"
      class="mt-2 text-sm text-wine"
    >
      {{ t('club.importError') }}
    </p>
  </section>
</template>
