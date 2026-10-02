<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAccountStore } from '../stores/account'
import LocaleSwitcher from './LocaleSwitcher.vue'
import logo from '../assets/images/logo-color.svg'

const { t } = useI18n()
const route = useRoute()
const account = useAccountStore()
const menuOpen = ref(false)

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
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="sticky top-0 z-20 flex items-center justify-between border-b border-rose/40 bg-ivory/90 px-5 pt-4 pb-3 backdrop-blur">
      <RouterLink
        to="/"
        class="flex items-center gap-2"
      >
        <img
          :src="logo"
          alt="Anota Canaston"
          class="h-9 w-9"
        >
        <span class="hidden font-display text-lg text-walnut sm:inline">Anota Canaston</span>
      </RouterLink>

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
        <LocaleSwitcher />
      </div>

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
                  d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
                />
              </svg>
            </span>
            <span class="text-lg font-medium text-walnut">{{ t('shell.navSessions') }}</span>
          </RouterLink>

          <RouterLink
            to="/rules"
            class="nav-stagger-3 flex items-center gap-4 rounded-2xl border border-rose/30 bg-linen px-5 py-4 transition-all active:scale-[0.98]"
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
            class="nav-stagger-4 flex items-center gap-4 rounded-2xl border border-rose/30 bg-linen px-5 py-4 transition-all active:scale-[0.98]"
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
            class="nav-stagger-5 flex items-center gap-4 rounded-2xl border border-rose/30 bg-linen px-5 py-4 transition-all active:scale-[0.98]"
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

          <RouterLink
            to="/welcome"
            class="nav-stagger-6 flex items-center gap-4 rounded-2xl border border-rose/30 bg-linen px-5 py-4 transition-all active:scale-[0.98]"
          >
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-wine-light text-wine">
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
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
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
        <div class="safe-bottom flex items-center justify-between border-t border-rose/30 px-5 py-4">
          <p class="text-xs text-clay">
            Anota Canaston
          </p>
          <LocaleSwitcher />
        </div>
      </div>
    </Transition>
  </div>
</template>
