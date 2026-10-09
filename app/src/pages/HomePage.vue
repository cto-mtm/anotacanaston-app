<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSessionsStore } from '../stores/sessions'
import { useMembershipStore } from '../stores/membership'
import SessionCard from '../components/SessionCard.vue'
import AccountBanner from '../components/AccountBanner.vue'
import ImportPrompt from '../components/ImportPrompt.vue'
import BaseButton from '../components/BaseButton.vue'
import WeaveWatermark from '../components/WeaveWatermark.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const sessionsStore = useSessionsStore()
const membership = useMembershipStore()

// How long to show "Confirmando tu pago…" before admitting it's taking a while.
const CHECKOUT_CONFIRM_TIMEOUT_MS = 30_000
const confirmingCheckout = ref(false)
const checkoutSlow = ref(false)
let checkoutTimer: ReturnType<typeof setTimeout> | undefined

// Stripe Checkout return. The webhook updates users/{uid}, which the live
// membership listener picks up — no polling: just wait for the status.
onMounted(() => {
  const checkout = route.query.checkout
  if (checkout === 'cancel') alert(t('club.checkoutCanceled'))
  if (checkout === 'success' && !membership.capabilities.canSync) {
    confirmingCheckout.value = true
    checkoutTimer = setTimeout(() => {
      checkoutSlow.value = true
    }, CHECKOUT_CONFIRM_TIMEOUT_MS)
  }
  if (checkout) router.replace({ query: {} })
})

watch(
  () => membership.capabilities.canSync,
  (canSync) => {
    if (!canSync || !confirmingCheckout.value) return
    confirmingCheckout.value = false
    checkoutSlow.value = false
    clearTimeout(checkoutTimer)
    alert(t('club.upgradeSuccess'))
  },
)

onBeforeUnmount(() => clearTimeout(checkoutTimer))
</script>

<template>
  <div>
    <p
      v-if="confirmingCheckout"
      class="mb-6 rounded-2xl border border-sage/40 bg-sage-light px-4 py-3 text-sm font-medium text-sage"
      role="status"
    >
      {{ checkoutSlow ? t('club.confirmingSlow') : t('club.confirming') }}
    </p>
    <ImportPrompt />
    <AccountBanner />

    <div class="mb-6 flex items-center justify-between">
      <h1 class="font-display text-2xl text-walnut">
        {{ t('home.title') }}
      </h1>
      <RouterLink to="/sessions/new">
        <BaseButton>{{ t('home.newSession') }}</BaseButton>
      </RouterLink>
    </div>

    <template v-if="sessionsStore.sessions.length === 0">
      <p class="text-clay">
        {{ t('home.empty') }}
      </p>
      <!-- Empty Home is a brand moment; a list of scores is not. -->
      <WeaveWatermark />
    </template>

    <TransitionGroup
      v-else
      name="list"
      tag="div"
      class="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <SessionCard
        v-for="session in sessionsStore.sessionsNewestFirst"
        :key="session.id"
        :session="session"
      />
    </TransitionGroup>
  </div>
</template>
