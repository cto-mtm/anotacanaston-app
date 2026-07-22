<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useSessionsStore } from '../stores/sessions'
import SessionCard from '../components/SessionCard.vue'
import BaseButton from '../components/BaseButton.vue'

const { t } = useI18n()
const sessionsStore = useSessionsStore()
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        {{ t('home.title') }}
      </h1>
      <RouterLink to="/sessions/new">
        <BaseButton>{{ t('home.newSession') }}</BaseButton>
      </RouterLink>
    </div>

    <p
      v-if="sessionsStore.sessions.length === 0"
      class="text-neutral-500"
    >
      {{ t('home.empty') }}
    </p>

    <TransitionGroup
      v-else
      name="list"
      tag="div"
      class="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <SessionCard
        v-for="session in sessionsStore.sessions"
        :key="session.id"
        :session="session"
      />
    </TransitionGroup>
  </div>
</template>
