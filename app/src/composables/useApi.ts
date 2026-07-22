import { ref } from 'vue'
import { apiFetch } from '../lib/api'

export function useApi<T>(path: string, init?: RequestInit) {
  const data = ref<T | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)

  async function execute() {
    loading.value = true
    error.value = null
    const result = await apiFetch<T>(path, init)
    if (result.ok) {
      data.value = result.data
    } else {
      error.value = result.error
    }
    loading.value = false
  }

  return { data, error, loading, execute }
}
