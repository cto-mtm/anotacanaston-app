<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Item } from '../stores/items'

defineProps<{ item: Item }>()
const { t } = useI18n()
</script>

<template>
  <RouterLink
    :to="`/items/${item.id}`"
    class="block overflow-hidden rounded-xl border border-neutral-200 shadow-sm transition-transform hover:-translate-y-0.5"
  >
    <!--
      Hero recipe step 1/3: the source element gets an inline dynamic
      view-transition-name derived from the item id. Never hardcode this in
      a v-for — a static name breaks as soon as two cards render at once.
    -->
    <div
      class="flex h-32 items-center justify-center text-white"
      :style="{ backgroundColor: item.color, viewTransitionName: 'item-' + item.id }"
    >
      <span class="text-3xl font-bold" :style="{ viewTransitionName: 'item-title-' + item.id }">
        {{ t(item.titleKey) }}
      </span>
    </div>
    <p class="p-3 text-sm text-neutral-500">{{ t(item.blurbKey) }}</p>
  </RouterLink>
</template>
