<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useItemsStore } from '../stores/items'

const route = useRoute()
const { t } = useI18n()
const items = useItemsStore()

const item = computed(() => items.items.find((i) => i.id === route.params.id))
</script>

<template>
  <div v-if="item">
    <RouterLink to="/" class="mb-4 inline-block text-sm text-indigo-600 hover:underline">
      ← {{ t('itemDetail.back') }}
    </RouterLink>

    <!-- Hero recipe step 2/3: same view-transition-name as the source card. -->
    <div
      class="flex h-56 items-center justify-center rounded-xl text-white"
      :style="{ backgroundColor: item.color, viewTransitionName: 'item-' + item.id }"
    >
      <span class="text-4xl font-bold" :style="{ viewTransitionName: 'item-title-' + item.id }">
        {{ t(item.titleKey) }}
      </span>
    </div>
    <p class="mt-4 text-neutral-600">{{ t(item.blurbKey) }}</p>
  </div>
  <p v-else>{{ t('itemDetail.notFound') }}</p>
</template>
