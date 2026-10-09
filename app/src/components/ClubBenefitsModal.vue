<script setup lang="ts">
// The one Club benefits modal, mounted in App.vue and opened anywhere via
// useClubModal(). Swipeable benefit cards (native CSS scroll-snap — no JS
// animation), the live Stripe price, and a CTA that adapts to the account:
//   member → "already have Club" · native app → web-only note
//   signed in → checkout · not signed in → Google sign-in, then checkout
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Capacitor } from '@capacitor/core'
import { useAccountStore } from '../stores/account'
import { useMembershipStore } from '../stores/membership'
import { useClubModal } from '../composables/useClubModal'
import { useClubPrice } from '../composables/useClubPrice'
import { useClubCheckout } from '../composables/useClubCheckout'
import BaseButton from './BaseButton.vue'
import BasketIcon from './icons/BasketIcon.vue'
import DevicesIcon from './icons/DevicesIcon.vue'
import ScorePadIcon from './icons/ScorePadIcon.vue'
import CheersIcon from './icons/CheersIcon.vue'

const { t } = useI18n()
const account = useAccountStore()
const membership = useMembershipStore()
const { isOpen, close } = useClubModal()
const { label: priceLabel, load: loadPrice } = useClubPrice()

const isNative = Capacitor.isNativePlatform()

// Icon tiles use the same tints as the menu (AppShell) for a shared language.
const BENEFITS = [
  { key: 'backup', icon: BasketIcon, tile: 'bg-wine-light text-wine', soon: false },
  { key: 'devices', icon: DevicesIcon, tile: 'bg-sage-light text-sage', soon: false },
  { key: 'stats', icon: ScorePadIcon, tile: 'bg-gold-light text-gold', soon: true },
  { key: 'gameNights', icon: CheersIcon, tile: 'bg-rose/30 text-walnut', soon: true },
] as const

const track = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const activeIndex = ref(0)
const { busy, error, alreadyMember, subscribe, reset: resetCheckout } = useClubCheckout()

function onScroll() {
  const el = track.value
  if (el && el.clientWidth > 0) activeIndex.value = Math.round(el.scrollLeft / el.clientWidth)
}

function goTo(index: number) {
  const el = track.value
  if (!el) return
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollTo({ left: index * el.clientWidth, behavior: reduced ? 'auto' : 'smooth' })
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(isOpen, async (open) => {
  // Lock background scroll while open, same as the mobile menu.
  document.documentElement.style.overflow = open ? 'hidden' : ''
  if (open) {
    window.addEventListener('keydown', onKeydown)
    void loadPrice()
    activeIndex.value = 0
    resetCheckout()
    await nextTick()
    if (track.value) track.value.scrollLeft = 0
    closeButton.value?.focus()
  } else {
    window.removeEventListener('keydown', onKeydown)
  }
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="club-modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-40 flex items-end justify-center bg-walnut/40 sm:items-center sm:p-5"
        @click.self="close"
      >
        <div
          class="club-modal-panel safe-bottom w-full max-w-md rounded-t-3xl bg-cream p-5 shadow-xl sm:rounded-3xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="club-modal-title"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2
                id="club-modal-title"
                class="font-display text-2xl text-walnut"
              >
                {{ t('club.modalTitle') }}
              </h2>
              <p class="mt-1 text-sm text-clay">
                {{ t('club.modalIntro') }}
              </p>
            </div>
            <button
              ref="closeButton"
              type="button"
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-clay transition-colors hover:bg-rose/30 hover:text-walnut"
              :aria-label="t('club.close')"
              @click="close"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                class="h-6 w-6"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <!-- Benefit cards: swipe (scroll-snap) or tap the dots -->
          <div
            ref="track"
            class="-mx-5 mt-4 flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
            @scroll.passive="onScroll"
          >
            <div
              v-for="benefit in BENEFITS"
              :key="benefit.key"
              class="w-full shrink-0 snap-center px-5"
            >
              <div class="flex h-full flex-col items-center rounded-2xl border border-rose/40 bg-linen px-5 py-6 text-center">
                <span
                  class="flex h-14 w-14 items-center justify-center rounded-2xl"
                  :class="benefit.tile"
                  aria-hidden="true"
                >
                  <component
                    :is="benefit.icon"
                    class="h-7 w-7"
                  />
                </span>
                <h3 class="mt-3 font-display text-lg text-walnut">
                  {{ t(`club.benefits.${benefit.key}.title`) }}
                </h3>
                <span
                  v-if="benefit.soon"
                  class="mt-1 rounded-full bg-gold-light px-2.5 py-0.5 text-xs font-semibold text-gold"
                >{{ t('club.soon') }}</span>
                <p class="mt-2 text-sm text-clay">
                  {{ t(`club.benefits.${benefit.key}.body`) }}
                </p>
              </div>
            </div>
          </div>

          <div class="mt-3 flex justify-center gap-1">
            <button
              v-for="(benefit, i) in BENEFITS"
              :key="benefit.key"
              type="button"
              class="flex h-8 w-8 items-center justify-center"
              :aria-label="t('club.goToBenefit', { n: i + 1 })"
              :aria-current="activeIndex === i"
              @click="goTo(i)"
            >
              <span
                class="block h-2 w-2 rounded-full transition-opacity duration-200"
                :class="activeIndex === i ? 'bg-wine opacity-100' : 'bg-walnut opacity-25'"
              />
            </button>
          </div>

          <div class="mt-3 text-center">
            <p
              v-if="priceLabel"
              class="font-display text-xl text-walnut"
            >
              {{ priceLabel }}
            </p>
            <p class="text-xs text-clay">
              {{ t('club.cancelAnytime') }}
            </p>
          </div>

          <div class="mt-4">
            <p
              v-if="membership.capabilities.canSync || alreadyMember"
              class="rounded-xl bg-sage-light px-4 py-3 text-center text-sm font-medium text-sage"
            >
              {{ t('club.alreadyMember') }}
            </p>
            <p
              v-else-if="isNative"
              class="text-center text-sm text-clay"
            >
              {{ t('club.webOnly') }}
            </p>
            <template v-else>
              <BaseButton
                class="w-full"
                :disabled="busy"
                @click="subscribe"
              >
                {{
                  busy
                    ? t('club.starting')
                    : account.isSignedIn
                      ? t('club.subscribe')
                      : t('club.signInAndSubscribe')
                }}
              </BaseButton>
              <p
                v-if="error"
                class="mt-2 text-center text-sm text-wine"
              >
                {{ t('club.error') }}
              </p>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
