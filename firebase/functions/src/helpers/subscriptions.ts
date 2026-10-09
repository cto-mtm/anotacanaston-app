// Pure subscription → membership logic (no Stripe client, no Firestore), so
// it's unit-testable. billing.ts does the I/O around it.

import type Stripe from 'stripe'

/** The subscription fields membership is derived from. */
export type SubscriptionLike = Pick<
  Stripe.Subscription,
  'status' | 'created' | 'customer' | 'start_date' | 'current_period_end' | 'cancel_at_period_end'
>

/**
 * Whether a Stripe subscription status unlocks cloud sync. `past_due` keeps
 * it on while Stripe retries the card; the app shows "update your card".
 */
export function syncAllowedFor(status: Stripe.Subscription.Status): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due'
}

/** Paid-up beats card-retrying beats everything else. */
function rank(status: Stripe.Subscription.Status): number {
  if (status === 'active' || status === 'trialing') return 2
  if (status === 'past_due') return 1
  return 0
}

/**
 * The subscription that decides membership. A customer can end up with more
 * than one (e.g. a stuck `incomplete` attempt plus a later successful
 * checkout), and an event about the stale one must not revoke the good one.
 * The best status wins; among equals, the most recently created.
 */
export function pickEffectiveSubscription<T extends Pick<SubscriptionLike, 'status' | 'created'>>(subs: T[]): T {
  if (subs.length === 0) throw new Error('no subscriptions to pick from')
  return subs.reduce((best, s) => {
    const diff = rank(s.status) - rank(best.status)
    return diff > 0 || (diff === 0 && s.created > best.created) ? s : best
  })
}

export function customerIdOf(customer: string | { id: string } | null): string | null {
  if (!customer) return null
  return typeof customer === 'string' ? customer : customer.id
}

/**
 * Events can arrive out of order: skip one older than the last event already
 * mirrored (both in ms). Equal stamps still apply — same-second events are
 * common and the data written is read fresh anyway.
 */
export function isStaleEvent(lastEventAt: unknown, eventAt: number): boolean {
  return typeof lastEventAt === 'number' && lastEventAt > eventAt
}

/**
 * The users/{uid} fields mirrored from a subscription — the shape
 * app/src/domain/membership.ts reads. Optional fields are only present when
 * known, because Firestore rejects `undefined`.
 */
export function membershipFields(sub: SubscriptionLike, eventAt: number, now: number) {
  const customerId = customerIdOf(sub.customer)
  return {
    cloudSync: syncAllowedFor(sub.status),
    subscriptionStatus: sub.status,
    memberSince: sub.start_date * 1000,
    currentPeriodEnd: sub.current_period_end * 1000,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    stripeEventAt: eventAt,
    updatedAt: now,
    ...(customerId ? { stripeCustomerId: customerId } : {}),
  }
}
