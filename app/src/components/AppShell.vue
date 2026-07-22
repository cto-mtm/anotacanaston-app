<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import LocaleSwitcher from './LocaleSwitcher.vue'

const { t } = useI18n()
</script>

<template>
  <div class="flex min-h-screen flex-col bg-neutral-50 text-neutral-900">
    <header class="safe-top sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur">
      <nav class="flex gap-4 text-sm font-medium">
        <RouterLink to="/" class="hover:text-indigo-600">{{ t('shell.navHome') }}</RouterLink>
        <RouterLink to="/about" class="hover:text-indigo-600">{{ t('shell.navAbout') }}</RouterLink>
      </nav>
      <LocaleSwitcher />
    </header>

    <main class="flex-1 px-4 py-6">
      <slot />
    </main>

    <nav class="safe-bottom border-t border-neutral-200 bg-white px-4 py-2 text-center text-xs text-neutral-400 sm:hidden">
      {{ t('shell.navHome') }} · {{ t('shell.navAbout') }}
    </nav>
  </div>
</template>
