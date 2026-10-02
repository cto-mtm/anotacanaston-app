// Client-side billing: kicks off Stripe Checkout for the Club subscription.
//
// Web only — native iOS/Android store rules forbid taking payment for digital
// goods through an in-app web checkout, so callers must gate this behind
// Capacitor.isNativePlatform() === false. Uses apiFetch with the signed-in
// user's Firebase ID token so the Cloud Function can trust the uid.

import { auth } from './firebase'
import { apiFetch } from './api'

interface CheckoutResponse {
  url: string
}

/**
 * Requests a Checkout Session URL from the backend and redirects the browser
 * to Stripe. On return, Stripe sends the user to successUrl / cancelUrl.
 * Throws on any failure so the caller can surface an error state.
 */
export async function startClubCheckout(): Promise<void> {
  const user = auth.currentUser
  if (!user) throw new Error('not signed in')

  const token = await user.getIdToken()
  const origin = window.location.origin
  const result = await apiFetch<CheckoutResponse>('/billing/create-checkout-session', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      successUrl: `${origin}/?checkout=success`,
      cancelUrl: `${origin}/?checkout=cancel`,
    }),
  })

  if (!result.ok) throw new Error(result.error)
  window.location.assign(result.data.url)
}
