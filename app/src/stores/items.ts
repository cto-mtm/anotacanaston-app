import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Item {
  id: string
  titleKey: string
  blurbKey: string
  color: string
}

const SEED_COLORS = ['#6366f1', '#ec4899', '#22c55e', '#f59e0b', '#06b6d4', '#8b5cf6']

export const useItemsStore = defineStore('items', () => {
  const items = ref<Item[]>(
    SEED_COLORS.map((color, i) => ({
      id: String(i + 1),
      titleKey: `home.items.${i + 1}.title`,
      blurbKey: `home.items.${i + 1}.blurb`,
      color,
    })),
  )

  function shuffle() {
    items.value = [...items.value].sort(() => Math.random() - 0.5)
  }

  return { items, shuffle }
})
