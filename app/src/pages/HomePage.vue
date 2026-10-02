<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSessionsStore } from '../stores/sessions'
import { awaitCheckoutEntitlement } from '../lib/auth'
import SessionCard from '../components/SessionCard.vue'
import AccountBanner from '../components/AccountBanner.vue'
import BaseButton from '../components/BaseButton.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const sessionsStore = useSessionsStore()

// Stripe Checkout return: wait for the webhook's entitlement (which also
// starts sync), then clear the query param.
onMounted(async () => {
  if (route.query.checkout !== 'success') return
  if (await awaitCheckoutEntitlement()) alert(t('account.upgradeSuccess'))
  router.replace({ query: {} })
})
</script>

<template>
  <div>
    <AccountBanner />

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
