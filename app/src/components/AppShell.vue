<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAccountStore } from '../stores/account'
import ProfileAvatar from './ProfileAvatar.vue'
import UserIcon from './icons/UserIcon.vue'
import logo from '../assets/images/logo-color-256.webp'
import CardStackIcon from './icons/CardStackIcon.vue'
import ScorePadIcon from './icons/ScorePadIcon.vue'

const { t } = useI18n()
const route = useRoute()
const account = useAccountStore()
const menuOpen = ref(false)

// The header's profile button: who's signed in (hover / screen reader).
const profileLabel = computed(() => {
  const name = account.isSignedIn ? account.user?.displayName || account.user?.email : null
  return name ? `${t('shell.profile')}: ${name}` : t('shell.profile')
})

// Closing on route change covers both tapping a nav link and any
// programmatic navigation while the menu happens to be open.
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)

// Lock background scroll while the full-screen menu is open.
watch(menuOpen, (open) => {
  document.documentElement.style.overflow = open ? 'hidden' : ''
})

// ── AUTO-HIDING HEADER ──────────────────────────────────────────
// Routes with `meta.autoHideHeader` slide the header away on scroll down
// and bring it back on scroll up. The visible header height is published
// as --shell-header-offset so pages can pin their own sticky bars below it.
const headerEl = ref<HTMLElement | null>(null)
const headerHeight = ref(0)
const headerHidden = ref(false)
const autoHide = computed(() => route.meta.autoHideHeader === true)
const SCROLL_DELTA = 8 // px of travel before the direction counts
const ALWAYS_SHOW_ABOVE = 80 // px from the top where the header always shows
let lastScrollY = 0

function onScroll() {
  const y = window.scrollY
  if (!autoHide.value || y < ALWAYS_SHOW_ABOVE) {
    headerHidden.value = false
    lastScrollY = y
    return
  }
  const delta = y - lastScrollY
  if (Math.abs(delta) < SCROLL_DELTA) return
  headerHidden.value = delta > 0
  lastScrollY = y
}

let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  if (headerEl.value) {
    resizeObserver = new ResizeObserver(() => {
      headerHeight.value = headerEl.value?.offsetHeight ?? 0
    })
    resizeObserver.observe(headerEl.value)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  resizeObserver?.disconnect()
})

watch(
  () => route.fullPath,
  () => {
    headerHidden.value = false
  },
)

watch(
  [headerHidden, headerHeight],
  ([hidden, height]) => {
    const root = document.documentElement.style
    root.setProperty('--shell-header-offset', `${hidden ? 0 : height}px`)
    // Full height regardless of visibility: scroll targets reserve room for
    // a header that may slide back in while the page scrolls upward.
    root.setProperty('--shell-header-height', `${height}px`)
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header
      ref="headerEl"
      class="sticky top-0 z-20 flex items-center justify-between bg-ivory/90 px-5 pt-4 pb-5 backdrop-blur transition-transform duration-200 motion-reduce:transition-none"
      :class="{ '-translate-y-full': headerHidden }"
      :inert="headerHidden"
    >
      <!-- The logo's basket weave as the header underline (main.css .weave-band). -->
      <div
        class="weave-band pointer-events-none absolute inset-x-0 bottom-0"
        aria-hidden="true"
      />
      <RouterLink
        to="/"
        class="flex items-center gap-2"
      >
        <img
          :src="logo"
          alt=""
          class="h-9 w-9"
        >
        <span class="font-display text-lg text-walnut">Anota Canaston</span>
      </RouterLink>

      <div class="flex items-center gap-5">
        <!-- Desktop nav -->
        <div class="hidden items-center gap-5 sm:flex">
          <nav class="flex gap-5 text-sm font-medium text-clay">
            <RouterLink
              to="/"
              class="transition-colors hover:text-wine"
            >
              {{ t('shell.navSessions') }}
            </RouterLink>
            <RouterLink
              to="/stats"
              class="transition-colors hover:text-wine"
            >
              {{ t('shell.navStats') }}
            </RouterLink>
            <RouterLink
              to="/rules"
              class="transition-colors hover:text-wine"
            >
              {{ t('shell.navRules') }}
            </RouterLink>
            <RouterLink
              to="/settings"
              class="transition-colors hover:text-wine"
            >
              {{ t('shell.navSettings') }}
            </RouterLink>
            <RouterLink
              to="/about"
              class="transition-colors hover:text-wine"
            >
              {{ t('shell.navAbout') }}
            </RouterLink>
          </nav>
          <RouterLink
            v-if="account.mode === 'offline'"
            to="/welcome"
            class="rounded-full bg-gold-light px-2.5 py-1 text-xs font-medium text-gold transition-colors hover:bg-gold/20"
            :title="t('shell.navAccount')"
          >
            {{ t('shell.offlineBadge') }}
          </RouterLink>
        </div>

        <div class="flex items-center gap-2">
          <!-- Profile: always visible, so signing in shows up right away -->
          <RouterLink
            to="/settings"
            class="flex h-11 w-11 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
            :aria-label="profileLabel"
            :title="profileLabel"
          >
            <ProfileAvatar />
          </RouterLink>

          <!-- Mobile hamburger toggle -->
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-xl text-walnut transition-colors hover:bg-linen sm:hidden"
            :aria-label="t('shell.openMenu')"
            aria-haspopup="true"
            :aria-expanded="menuOpen"
            @click="menuOpen = true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              class="h-6 w-6"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <main class="flex-1 px-5 py-6">
      <slot />
    </main>

    <!-- Mobile full-screen menu -->
    <Transition name="mobile-menu">
      <div
        v-if="menuOpen"
        class="fixed inset-0 z-30 flex flex-col bg-cream sm:hidden safe-top"
        role="dialog"
        aria-modal="true"
      >
        <!-- Close button — floating top-right -->
        <div class="flex justify-end px-5 pt-3">
          <button
            type="button"
            class="flex h-12 w-12 items-center justify-center rounded-2xl bg-linen text-clay transition-all hover:bg-rose/30 hover:text-walnut active:scale-90"
            :aria-label="t('shell.closeMenu')"
            @click="menuOpen = false"
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

        <!-- Centered brand -->
        <div class="flex flex-col items-center gap-2 px-5 pt-4 pb-6">
          <img
            :src="logo"
            alt="Anota Canaston"
            class="nav-stagger-1 h-16 w-16"
          >
          <span class="nav-stagger-1 font-display text-xl text-walnut">Anota Canaston</span>
        </div>

        <!-- Nav links — large, card-like items with staggered entrance -->
        <nav class="flex flex-1 flex-col gap-2 px-5">
          <RouterLink
            to="/"
            class="nav-stagger-2 flex items-center gap-4 rounded-2xl border border-rose/30 bg-linen px-5 py-4 transition-all active:scale-[0.98]"
          >
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-wine-light text-wine">
              <CardStackIcon class="h-5 w-5" />
            </span>
            <span class="text-lg font-medium text-walnut">{{ t('shell.navSessions') }}</span>
          </RouterLink>

          <RouterLink
            to="/stats"
            class="nav-stagger-3 flex items-center gap-4 rounded-2xl border border-rose/30 bg-linen px-5 py-4 transition-all active:scale-[0.98]"
          >
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-light text-sage">
              <ScorePadIcon class="h-5 w-5" />
            </span>
            <span class="text-lg font-medium text-walnut">{{ t('shell.navStats') }}</span>
          </RouterLink>

          <RouterLink
            to="/rules"
            class="nav-stagger-4 flex items-center gap-4 rounded-2xl border border-rose/30 bg-linen px-5 py-4 transition-all active:scale-[0.98]"
          >
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-light text-gold">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                class="h-5 w-5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
            </span>
            <span class="text-lg font-medium text-walnut">{{ t('shell.navRules') }}</span>
          </RouterLink>

          <RouterLink
            to="/settings"
            class="nav-stagger-5 flex items-center gap-4 rounded-2xl border border-rose/30 bg-linen px-5 py-4 transition-all active:scale-[0.98]"
          >
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-rose/30 text-walnut">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                class="h-5 w-5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
                />
              </svg>
            </span>
            <span class="text-lg font-medium text-walnut">{{ t('shell.navSettings') }}</span>
          </RouterLink>

          <RouterLink
            to="/about"
            class="nav-stagger-6 flex items-center gap-4 rounded-2xl border border-rose/30 bg-linen px-5 py-4 transition-all active:scale-[0.98]"
          >
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-light text-sage">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                class="h-5 w-5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                />
              </svg>
            </span>
            <span class="text-lg font-medium text-walnut">{{ t('shell.navAbout') }}</span>
          </RouterLink>

          <!-- Signed in: who you are, and it opens the account in Settings -->
          <RouterLink
            v-if="account.isSignedIn"
            to="/settings"
            class="nav-stagger-7 flex items-center gap-4 rounded-2xl border border-rose/30 bg-linen px-5 py-4 transition-all active:scale-[0.98]"
          >
            <ProfileAvatar size="md" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-lg font-medium text-walnut">{{ account.user?.displayName || t('shell.navAccount') }}</span>
              <span class="block truncate text-xs text-clay">{{ account.user?.email }}</span>
            </span>
          </RouterLink>
          <RouterLink
            v-else
            to="/welcome"
            class="nav-stagger-7 flex items-center gap-4 rounded-2xl border border-rose/30 bg-linen px-5 py-4 transition-all active:scale-[0.98]"
          >
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-wine-light text-wine">
              <UserIcon class="h-5 w-5" />
            </span>
            <span class="flex-1 text-lg font-medium text-walnut">{{ t('shell.navAccount') }}</span>
            <span
              v-if="account.mode === 'offline'"
              class="rounded-full bg-gold-light px-2.5 py-1 text-xs font-semibold text-gold"
            >
              {{ t('shell.offlineBadge') }}
            </span>
          </RouterLink>
        </nav>

        <!-- Footer -->
        <div class="safe-bottom border-t border-rose/30 px-5 py-4">
          <p class="text-xs text-clay">
            Anota Canaston
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>
