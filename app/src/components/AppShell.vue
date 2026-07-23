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
  <div class="flex min-h-screen flex-col bg-neutral-50 text-neutral-900">
    <header class="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-200 bg-white/90 px-4 pt-4 pb-3 backdrop-blur">
      <RouterLink
        to="/"
        class="flex items-center gap-2"
      >
        <img
          :src="logo"
          alt="Anota Canaston"
          class="h-8 w-8"
        >
        <span class="hidden text-lg font-semibold sm:inline">Anota Canaston</span>
      </RouterLink>

      <!-- Desktop nav -->
      <div class="hidden items-center gap-4 sm:flex">
        <nav class="flex gap-4 text-sm font-medium">
          <RouterLink
            to="/"
            class="hover:text-indigo-600"
          >
            {{ t('shell.navSessions') }}
          </RouterLink>
          <RouterLink
            to="/rules"
            class="hover:text-indigo-600"
          >
            {{ t('shell.navRules') }}
          </RouterLink>
          <RouterLink
            to="/about"
            class="hover:text-indigo-600"
          >
            {{ t('shell.navAbout') }}
          </RouterLink>
        </nav>
        <RouterLink
          v-if="account.mode === 'offline'"
          to="/welcome"
          class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200"
          :title="t('shell.navAccount')"
        >
          {{ t('shell.offlineBadge') }}
        </RouterLink>
        <LocaleSwitcher />
      </div>

      <!-- Mobile hamburger toggle -->
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-100 sm:hidden"
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

    <main class="flex-1 px-4 py-6">
      <slot />
    </main>

    <!-- Mobile full-screen menu -->
    <Transition name="mobile-menu">
      <div
        v-if="menuOpen"
        class="fixed inset-0 z-30 flex flex-col bg-white sm:hidden"
        role="dialog"
        aria-modal="true"
      >
        <div class="safe-top flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <RouterLink
            to="/"
            class="flex items-center gap-2"
          >
            <img
              :src="logo"
              alt="Anota Canaston"
              class="h-8 w-8"
            >
            <span class="text-lg font-semibold">Anota Canaston</span>
          </RouterLink>
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-100"
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

        <nav class="flex flex-1 flex-col gap-1 p-4 text-lg font-medium">
          <RouterLink
            to="/"
            class="rounded-lg px-4 py-3 hover:bg-neutral-100"
          >
            {{ t('shell.navSessions') }}
          </RouterLink>
          <RouterLink
            to="/rules"
            class="rounded-lg px-4 py-3 hover:bg-neutral-100"
          >
            {{ t('shell.navRules') }}
          </RouterLink>
          <RouterLink
            to="/about"
            class="rounded-lg px-4 py-3 hover:bg-neutral-100"
          >
            {{ t('shell.navAbout') }}
          </RouterLink>
          <RouterLink
            to="/welcome"
            class="flex items-center justify-between rounded-lg px-4 py-3 hover:bg-neutral-100"
          >
            {{ t('shell.navAccount') }}
            <span
              v-if="account.mode === 'offline'"
              class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800"
            >
              {{ t('shell.offlineBadge') }}
            </span>
          </RouterLink>
        </nav>

        <div class="safe-bottom border-t border-neutral-200 p-4">
          <LocaleSwitcher />
        </div>
      </div>
    </Transition>
  </div>
</template>
