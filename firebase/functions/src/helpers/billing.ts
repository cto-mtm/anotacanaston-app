// Stripe billing helpers: checkout-session creation and webhook handling for
// the Club (cloud-sync) subscription.
//
// Secrets follow the repo's documented pattern (defineSecret in index-style
// modules; see api.ts). They must be set before deploy:
//   firebase functions:secrets:set STRIPE_SECRET
//   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
// The price is not configured: checkout uses the default price of the Club
// product, so changing the price is a dashboard-only change — create a new
// recurring price and make it the product's default.
//
// The product id differs between Stripe live and test mode, so it's a
// non-secret env value, STRIPE_PRODUCT_ID (see functions/.env.example):
// production reads it from .env.anotacanaston-app, the emulator from .env.local.

import Stripe from 'stripe'
import { defineSecret } from 'firebase-functions/params'
import { logger } from 'firebase-functions/v2'
import { adminAuth, adminDb } from './admin.js'
import { customerIdOf, isStaleEvent, membershipFields, pickEffectiveSubscription } from './subscriptions.js'

// ReturnType avoids TS2742 (the inferred SecretParam type isn't publicly
// re-exported from firebase-functions/params, so it can't be named directly).
type Secret = ReturnType<typeof defineSecret>
export const stripeSecret: Secret = defineSecret('STRIPE_SECRET')
export const stripeWebhookSecret: Secret = defineSecret('STRIPE_WEBHOOK_SECRET')

function stripeClient(): Stripe {
  // Omit apiVersion so the SDK uses the version pinned in the dashboard,
  // avoiding a compile-time coupling to the SDK's bundled literal type.
  return new Stripe(stripeSecret.value())
}

/** "Canastón Premium" — the cloud-sync subscription product, for the current Stripe mode. */
function clubProductId(): string {
  const id = process.env.STRIPE_PRODUCT_ID
  if (!id) throw new Error('STRIPE_PRODUCT_ID is not configured (see functions/.env.example)')
  return id
}

const PRICE_CACHE_MS = 5 * 60 * 1000
let cachedPrice: { price: Stripe.Price; fetchedAt: number } | null = null

/**
 * The product's current default price, cached briefly so every checkout (and
 * every price display) doesn't cost an extra Stripe round-trip.
 */
async function clubPrice(stripe: Stripe): Promise<Stripe.Price> {
  if (cachedPrice && Date.now() - cachedPrice.fetchedAt < PRICE_CACHE_MS) return cachedPrice.price

  const productId = clubProductId()
  const product = await stripe.products.retrieve(productId, { expand: ['default_price'] })
  const price = product.default_price
  if (!price || typeof price === 'string') {
    throw new Error(`Stripe product ${productId} has no default price`)
  }
  if (!price.active || !price.recurring || price.unit_amount === null) {
    throw new Error(`Default price ${price.id} of ${productId} must be active, recurring and fixed-amount`)
  }

  cachedPrice = { price, fetchedAt: Date.now() }
  return price
}

export interface ClubPriceInfo {
  /** In the currency's minor unit (cents), as Stripe reports it. */
  amount: number
  /** ISO 4217, uppercase (e.g. "USD"). */
  currency: string
  interval: Stripe.Price.Recurring.Interval
}

/** Public, display-only view of the Club price. */
export async function getClubPriceInfo(): Promise<ClubPriceInfo> {
  const price = await clubPrice(stripeClient())
  return {
    amount: price.unit_amount ?? 0,
    currency: price.currency.toUpperCase(),
    interval: price.recurring?.interval ?? 'month',
  }
}

/** Thrown when an account that already has Club tries to check out again. */
export class AlreadySubscribedError extends Error {}

/** Thrown when an account with no Stripe customer asks for the billing portal. */
export class NoCustomerError extends Error {}

interface UserBilling {
  cloudSync: boolean
  stripeCustomerId: string | null
}

async function readUserBilling(uid: string): Promise<UserBilling> {
  const data = (await adminDb.collection('users').doc(uid).get()).data()
  return {
    cloudSync: data?.cloudSync === true,
    stripeCustomerId: typeof data?.stripeCustomerId === 'string' ? data.stripeCustomerId : null,
  }
}

/**
 * Creates a subscription Checkout Session for `uid`. The uid is stored in both
 * client_reference_id and subscription metadata so the webhook can map the
 * payment back to the Firestore user without trusting any client input.
 * Refuses if the account already has Club, and reuses its Stripe customer so
 * one account never ends up with several customers or subscriptions.
 */
export async function createCheckoutSession(
  uid: string,
  email: string | undefined,
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  const billing = await readUserBilling(uid)
  if (billing.cloudSync) throw new AlreadySubscribedError(`${uid} already has Club`)

  const stripe = stripeClient()
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: (await clubPrice(stripe)).id, quantity: 1 }],
    client_reference_id: uid,
    ...(billing.stripeCustomerId ? { customer: billing.stripeCustomerId } : { customer_email: email }),
    subscription_data: { metadata: { firebaseUid: uid } },
    success_url: successUrl,
    cancel_url: cancelUrl,
  })
  if (!session.url) throw new Error('Stripe did not return a checkout URL')
  return session.url
}

/**
 * A Stripe Customer Portal session, where the subscriber can cancel, change
 * their card or download invoices. Requires the portal to be enabled in the
 * Stripe dashboard (Settings → Billing → Customer portal).
 */
export async function createPortalSession(uid: string, returnUrl: string): Promise<string> {
  const { stripeCustomerId } = await readUserBilling(uid)
  if (!stripeCustomerId) throw new NoCustomerError(`${uid} has no Stripe customer`)
  const session = await stripeClient().billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  })
  return session.url
}

/**
 * Account deletion: cancels any live subscription immediately, then deletes
 * the user's Firestore data (users/{uid} and every session) and their auth
 * account. Stripe keeps its own payment records, as it must.
 */
export async function deleteAccount(uid: string): Promise<void> {
  const { stripeCustomerId } = await readUserBilling(uid)
  if (stripeCustomerId) {
    const stripe = stripeClient()
    const subscriptions = await stripe.subscriptions.list({ customer: stripeCustomerId, status: 'all' })
    for (const sub of subscriptions.data) {
      if (sub.status !== 'canceled' && sub.status !== 'incomplete_expired') {
        await stripe.subscriptions.cancel(sub.id)
      }
    }
  }
  await adminDb.recursiveDelete(adminDb.collection('users').doc(uid))
  await adminAuth.deleteUser(uid)
  logger.info('account deleted', { uid })
}

/**
 * Verifies + processes a Stripe webhook. Flips users/{uid}.cloudSync based on
 * subscription lifecycle. Returns a short status string for logging.
 */
export async function handleWebhook(rawBody: Buffer, signature: string): Promise<string> {
  const event = stripeClient().webhooks.constructEvent(
    rawBody,
    signature,
    stripeWebhookSecret.value(),
  )

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const uid = session.client_reference_id
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
      if (!uid || !subscriptionId) return `ignored checkout without uid/subscription`
      const stripe = stripeClient()
      const sub = await effectiveSubscription(stripe, await stripe.subscriptions.retrieve(subscriptionId))
      await writeSubscription(uid, sub, event.created, { createIfMissing: true })
      return `checkout → ${sub.status} for ${uid}`
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const uid = event.data.object.metadata?.firebaseUid
      if (!uid) return `${event.type} without firebaseUid`
      const sub = await effectiveSubscription(stripeClient(), event.data.object)
      // Never (re)create the user doc here: after an account deletion, the
      // cancellation webhook must not resurrect it.
      await writeSubscription(uid, sub, event.created, { createIfMissing: false })
      return `${event.type} → ${sub.status} for ${uid}`
    }
    default:
      return `ignored ${event.type}`
  }
}

/** Reads the customer's current subscriptions instead of trusting the event (see pickEffectiveSubscription). */
async function effectiveSubscription(stripe: Stripe, eventSub: Stripe.Subscription): Promise<Stripe.Subscription> {
  const customerId = customerIdOf(eventSub.customer)
  if (!customerId) return eventSub
  const { data } = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 })
  return pickEffectiveSubscription(data.length > 0 ? data : [eventSub])
}

/**
 * Mirrors the subscription onto users/{uid} — the only document the app reads
 * to derive membership (see app/src/domain/membership.ts for the shape).
 * Events can arrive out of order, so an older event never overwrites a newer one.
 */
async function writeSubscription(
  uid: string,
  sub: Stripe.Subscription,
  eventCreated: number,
  { createIfMissing }: { createIfMissing: boolean },
): Promise<void> {
  const ref = adminDb.collection('users').doc(uid)
  const eventAt = eventCreated * 1000
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists && !createIfMissing) {
      logger.info('subscription update skipped: no user doc', { uid, status: sub.status })
      return
    }
    if (isStaleEvent(snap.data()?.stripeEventAt, eventAt)) {
      logger.info('subscription update skipped: stale event', { uid, status: sub.status })
      return
    }
    tx.set(
      ref,
      membershipFields(sub, eventAt, Date.now()),
      { merge: true },
    )
  })
  logger.info('subscription mirrored', { uid, status: sub.status })
}
