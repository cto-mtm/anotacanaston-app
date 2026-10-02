// Stripe billing helpers: checkout-session creation and webhook handling for
// the Club (cloud-sync) subscription.
//
// Secrets follow the repo's documented pattern (defineSecret in index-style
// modules; see api.ts). They must be set before deploy:
//   firebase functions:secrets:set STRIPE_SECRET
//   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
// The price id is a non-secret config value (VITE-style env), read from
// process.env.STRIPE_PRICE_ID — set it in functions' runtime env or .env.

import Stripe from 'stripe'
import { defineSecret } from 'firebase-functions/params'
import { logger } from 'firebase-functions/v2'
import { adminDb } from './admin.js'

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

/** The Club subscription price id, created in the Stripe dashboard. */
function priceId(): string {
  const id = process.env.STRIPE_PRICE_ID
  if (!id) throw new Error('STRIPE_PRICE_ID is not configured')
  return id
}

/**
 * Creates a subscription Checkout Session for `uid`. The uid is stored in both
 * client_reference_id and subscription metadata so the webhook can map the
 * payment back to the Firestore user without trusting any client input.
 */
export async function createCheckoutSession(
  uid: string,
  email: string | undefined,
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  const session = await stripeClient().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId(), quantity: 1 }],
    client_reference_id: uid,
    customer_email: email,
    subscription_data: { metadata: { firebaseUid: uid } },
    success_url: successUrl,
    cancel_url: cancelUrl,
  })
  if (!session.url) throw new Error('Stripe did not return a checkout URL')
  return session.url
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
      if (uid) await setEntitlement(uid, true, session.customer as string | null)
      return `activated ${uid ?? 'unknown'}`
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object
      const uid = sub.metadata?.firebaseUid
      // active/trialing keep sync on; anything else (canceled, past_due,
      // unpaid, incomplete_expired) turns it off.
      const active = sub.status === 'active' || sub.status === 'trialing'
      if (uid) await setEntitlement(uid, active, sub.customer as string | null)
      return `${event.type} → ${active ? 'on' : 'off'} for ${uid ?? 'unknown'}`
    }
    default:
      return `ignored ${event.type}`
  }
}

async function setEntitlement(uid: string, cloudSync: boolean, customerId: string | null): Promise<void> {
  await adminDb
    .collection('users')
    .doc(uid)
    .set(
      {
        cloudSync,
        stripeCustomerId: customerId ?? undefined,
        updatedAt: Date.now(),
      },
      { merge: true },
    )
  logger.info('entitlement updated', { uid, cloudSync })
}
