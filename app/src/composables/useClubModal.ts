import { ref } from 'vue'

// One global Club benefits modal (mounted in App.vue). Any page or component
// opens it through this composable instead of rendering its own copy.
const isOpen = ref(false)

export function useClubModal() {
  return {
    isOpen,
    open: () => {
      isOpen.value = true
    },
    close: () => {
      isOpen.value = false
    },
  }
}
