<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { formatPoints } from '../../composables/useRoundLines'

/**
 * One accordion step of the round entry. Collapsed, it shows a one-line
 * summary of what was entered and what it is worth, so the table can check
 * the scorer's work at a glance; tapping it reopens the step.
 */
defineProps<{
  id: string
  title: string
  summary?: string
  points?: number | null
  state: 'open' | 'done' | 'todo'
  /** Small count badge (e.g. penalties set) shown next to the title. */
  badge?: number
}>()
defineEmits<{ toggle: [] }>()
const { t, n } = useI18n()
</script>

<template>
  <section
    :id="id"
    class="scroll-mt-[calc(var(--shell-header-height,0px)+5rem)] rounded-2xl border bg-linen transition-colors"
    :class="state === 'open' ? 'border-wine/40 shadow-sm shadow-wine/10' : 'border-rose/40'"
  >
    <h3>
      <button
        type="button"
        class="flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left"
        :aria-expanded="state === 'open'"
        :aria-controls="`${id}-body`"
        @click="$emit('toggle')"
      >
        <span
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs"
          :class="{
            'border-wine bg-wine text-white': state === 'open',
            'border-sage bg-sage text-white': state === 'done',
            'border-rose/70 text-transparent': state === 'todo',
          }"
          aria-hidden="true"
        >
          <svg
            v-if="state === 'open'"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="h-3.5 w-3.5"
          ><path d="M5.2 7.2a.75.75 0 0 1 1.06 0L10 10.94l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.26a.75.75 0 0 1 0-1.06Z" /></svg>
          <svg
            v-else-if="state === 'done'"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="h-3.5 w-3.5"
          ><path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.58l7.3-7.3a1 1 0 0 1 1.4 0Z" /></svg>
        </span>
        <span class="sr-only">{{ state === 'done' ? t('roundEntry.sectionDone') : state === 'todo' ? t('roundEntry.sectionTodo') : '' }}</span>
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-2 text-sm font-semibold text-walnut">
            {{ title }}
            <span
              v-if="badge"
              class="rounded-full bg-wine-light px-1.5 text-xs font-semibold text-wine"
            >{{ n(badge) }}</span>
          </span>
          <span
            v-if="state !== 'open' && summary"
            class="block truncate text-xs text-clay"
          >{{ summary }}</span>
        </span>
        <span
          v-if="points !== null && points !== undefined && (points !== 0 || state === 'done')"
          class="shrink-0 text-sm font-semibold tabular-nums"
          :class="points < 0 ? 'text-wine' : 'text-walnut'"
        >{{ formatPoints(points, n) }}</span>
      </button>
    </h3>
    <div
      v-if="state === 'open'"
      :id="`${id}-body`"
      class="border-t border-rose/30 px-4 pt-3 pb-4"
    >
      <slot />
    </div>
  </section>
</template>
