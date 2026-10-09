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

/** Display-only Club price, straight from the Stripe product's default price. */
export interface ClubPrice {
  /** Minor units (cents). */
  amount: number
  /** ISO 4217, e.g. "USD". */
  currency: string
  interval: 'day' | 'week' | 'month' | 'year'
}

let pricePromise: Promise<ClubPrice | null> | null = null

/**
 * Fetches the Club price once per page load. Resolves null on any failure so
 * callers can simply hide the price instead of showing a stale literal.
 */
export function fetchClubPrice(): Promise<ClubPrice | null> {
  pricePromise ??= apiFetch<ClubPrice>('/billing/price').then((result) => {
    if (result.ok) return result.data
    pricePromise = null // allow a retry next time
    return null
  })
  return pricePromise
}

/** The server refused checkout because this account already has Club. */
export class AlreadySubscribedError extends Error {}

/** POSTs to an endpoint as the signed-in user (Firebase ID token). */
async function authedPost<T>(path: string, body: unknown) {
  const user = auth.currentUser
  if (!user) throw new Error('not signed in')
  const token = await user.getIdToken()
  return apiFetch<T>(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
}

/**
 * Requests a Checkout Session URL from the backend and redirects the browser
 * to Stripe. On return, Stripe sends the user to successUrl / cancelUrl.
 * Throws on any failure so the caller can surface an error state.
 */
export async function startClubCheckout(): Promise<void> {
  const origin = window.location.origin
  const result = await authedPost<CheckoutResponse>('/billing/create-checkout-session', {
    successUrl: `${origin}/?checkout=success`,
    cancelUrl: `${origin}/?checkout=cancel`,
  })
  if (!result.ok) {
    if (result.error.includes('already subscribed')) throw new AlreadySubscribedError(result.error)
    throw new Error(result.error)
  }
  window.location.assign(result.data.url)
}

/** Opens the Stripe Customer Portal (cancel, change card, invoices). */
export async function openBillingPortal(): Promise<void> {
  const result = await authedPost<{ url: string }>('/billing/portal', {
    returnUrl: `${window.location.origin}/settings`,
  })
  if (!result.ok) throw new Error(result.error)
  window.location.assign(result.data.url)
}

/** Deletes the signed-in account: cancels Club, wipes cloud data, removes the login. */
export async function deleteCloudAccount(): Promise<void> {
  const result = await authedPost<{ deleted: boolean }>('/account/delete', {})
  if (!result.ok) throw new Error(result.error)
}
