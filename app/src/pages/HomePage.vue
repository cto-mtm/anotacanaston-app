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
    <div class="mb-6 flex items-center justify-between">
      <h1 class="font-display text-2xl text-walnut">
        {{ t('home.title') }}
      </h1>
      <RouterLink to="/sessions/new">
        <BaseButton>{{ t('home.newSession') }}</BaseButton>
      </RouterLink>
    </div>

    <p
      v-if="sessionsStore.sessions.length === 0"
      class="text-clay"
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
