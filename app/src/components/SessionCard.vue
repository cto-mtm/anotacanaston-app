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
    class="block overflow-hidden rounded-2xl border border-rose/40 bg-linen shadow-sm shadow-walnut/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-walnut/10"
  >
    <!-- Hero recipe: unique view-transition-name derived from session.id. -->
    <div
      class="flex items-center justify-between p-5"
      :style="{ viewTransitionName: 'session-' + session.id }"
    >
      <div>
        <p
          class="font-display text-lg text-walnut"
          :style="{ viewTransitionName: 'session-title-' + session.id }"
        >
          {{ d(parseLocalDate(session.date), 'short') }}
        </p>
        <p class="mt-0.5 text-sm text-clay">
          {{ playerNames }}
        </p>
      </div>
      <span
        class="rounded-full px-2.5 py-1 text-xs font-medium"
        :class="session.status === 'finished' ? 'bg-linen text-clay border border-rose/40' : 'bg-sage-light text-sage'"
      >
        {{ session.status === 'finished' ? t('home.statusFinished') : t('home.statusInProgress') }}
      </span>
    </div>
  </RouterLink>
</template>
