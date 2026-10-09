import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchClubPrice, type ClubPrice } from '../lib/billing'

/**
 * The Club price as a localized label ("2,99 US$/mes"), or null until `load()`
 * resolves or if Stripe can't be reached — callers hide the price line then.
 * Loading is explicit so the price is only fetched when it's about to be shown.
 */
export function useClubPrice() {
  const { t, n } = useI18n()
  const price = ref<ClubPrice | null>(null)

  async function load() {
    price.value ??= await fetchClubPrice()
  }

  const label = computed(() => {
    if (!price.value) return null
    const { amount, currency, interval } = price.value
    // Stripe reports minor units; the currency decides how many there are.
    const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
    const formatted = n(amount / 10 ** digits, { key: 'currency', currency })
    return t(`club.pricePer.${interval}`, { price: formatted })
  })

  return { label, load }
}
