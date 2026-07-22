import { ref, onMounted, onUnmounted } from 'vue'

export function useReducedMotion() {
  const query = matchMedia('(prefers-reduced-motion: reduce)')
  const prefersReducedMotion = ref(query.matches)

  function update() {
    prefersReducedMotion.value = query.matches
  }

  onMounted(() => query.addEventListener('change', update))
  onUnmounted(() => query.removeEventListener('change', update))

  return { prefersReducedMotion }
}
