<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { parseLocalDate } from '../lib/date'
import type { Session } from '../domain/types'

const props = defineProps<{ session: Session }>()
const { t, d } = useI18n()

const playerNames = computed(() => props.session.players.map((p) => p.name).join(', '))
</script>

<template>
  <RouterLink
    :to="`/sessions/${session.id}`"
    class="block overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-transform hover:-translate-y-0.5"
  >
    <!-- Hero recipe: unique view-transition-name derived from session.id. -->
    <div
      class="flex items-center justify-between p-4"
      :style="{ viewTransitionName: 'session-' + session.id }"
    >
      <div>
        <p
          class="font-semibold"
          :style="{ viewTransitionName: 'session-title-' + session.id }"
        >
          {{ d(parseLocalDate(session.date), 'short') }}
        </p>
        <p class="text-sm text-neutral-500">
          {{ playerNames }}
        </p>
      </div>
      <span
        class="rounded-full px-2 py-1 text-xs font-medium"
        :class="session.status === 'finished' ? 'bg-neutral-200 text-neutral-600' : 'bg-green-100 text-green-700'"
      >
        {{ session.status === 'finished' ? t('home.statusFinished') : t('home.statusInProgress') }}
      </span>
    </div>
  </RouterLink>
</template>
