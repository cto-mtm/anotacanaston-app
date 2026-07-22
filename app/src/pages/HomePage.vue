<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useItemsStore } from '../stores/items'
import ItemCard from '../components/ItemCard.vue'
import BaseButton from '../components/BaseButton.vue'

const { t } = useI18n()
const items = useItemsStore()
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-2xl font-bold">{{ t('home.title') }}</h1>
      <BaseButton @click="items.shuffle">{{ t('home.shuffle') }}</BaseButton>
    </div>

    <TransitionGroup name="list" tag="div" class="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <ItemCard v-for="item in items.items" :key="item.id" :item="item" />
    </TransitionGroup>
  </div>
</template>
