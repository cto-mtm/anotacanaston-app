import { describe, expect, it } from 'vitest'
import type Stripe from 'stripe'
import {
  customerIdOf,
  isStaleEvent,
  membershipFields,
  pickEffectiveSubscription,
  syncAllowedFor,
  type SubscriptionLike,
} from './subscriptions'

function sub(status: Stripe.Subscription.Status, created: number, overrides: Partial<SubscriptionLike> = {}) {
  return {
    status,
    created,
    customer: 'cus_1',
    start_date: 1_000,
    current_period_end: 2_000,
    cancel_at_period_end: false,
    ...overrides,
  } satisfies SubscriptionLike
}

describe('syncAllowedFor', () => {
  it('allows paid-up and card-retrying subscriptions', () => {
    expect(syncAllowedFor('active')).toBe(true)
    expect(syncAllowedFor('trialing')).toBe(true)
    expect(syncAllowedFor('past_due')).toBe(true)
  })

  it('blocks everything else', () => {
    for (const status of ['incomplete', 'incomplete_expired', 'canceled', 'unpaid', 'paused'] as const) {
      expect(syncAllowedFor(status)).toBe(false)
    }
  })
})

describe('pickEffectiveSubscription', () => {
  it('keeps an active subscription over a newer expired attempt', () => {
    // The bug this guards: a stuck first checkout expiring after a successful second one.
    const active = sub('active', 100)
    const expired = sub('incomplete_expired', 200)
    expect(pickEffectiveSubscription([expired, active])).toBe(active)
  })

  it('prefers active over past_due', () => {
    const pastDue = sub('past_due', 200)
    const active = sub('active', 100)
    expect(pickEffectiveSubscription([pastDue, active])).toBe(active)
  })

  it('prefers past_due over canceled', () => {
    const pastDue = sub('past_due', 100)
    const canceled = sub('canceled', 200)
    expect(pickEffectiveSubscription([canceled, pastDue])).toBe(pastDue)
  })

  it('picks the newest among equals', () => {
    const older = sub('canceled', 100)
    const newer = sub('canceled', 200)
    expect(pickEffectiveSubscription([older, newer])).toBe(newer)
    expect(pickEffectiveSubscription([newer, older])).toBe(newer)
  })

  it('returns the only subscription', () => {
    const only = sub('unpaid', 100)
    expect(pickEffectiveSubscription([only])).toBe(only)
  })

  it('throws on an empty list', () => {
    expect(() => pickEffectiveSubscription([])).toThrow()
  })
})

describe('isStaleEvent', () => {
  it('skips an event older than the last mirrored one', () => {
    expect(isStaleEvent(2_000, 1_000)).toBe(true)
  })

  it('applies newer and same-second events', () => {
    expect(isStaleEvent(1_000, 2_000)).toBe(false)
    expect(isStaleEvent(1_000, 1_000)).toBe(false)
  })

  it('applies when nothing was mirrored yet', () => {
    expect(isStaleEvent(undefined, 1_000)).toBe(false)
    expect(isStaleEvent('garbage', 1_000)).toBe(false)
  })
})

describe('customerIdOf', () => {
  it('handles ids, expanded objects and null', () => {
    expect(customerIdOf('cus_1')).toBe('cus_1')
    expect(customerIdOf({ id: 'cus_2' })).toBe('cus_2')
    expect(customerIdOf(null)).toBeNull()
  })
})

describe('membershipFields', () => {
  it('mirrors the subscription in the shape the app reads, in ms', () => {
    expect(membershipFields(sub('past_due', 100, { cancel_at_period_end: true }), 5_000, 9_000)).toEqual({
      cloudSync: true,
      subscriptionStatus: 'past_due',
      memberSince: 1_000_000,
      currentPeriodEnd: 2_000_000,
      cancelAtPeriodEnd: true,
      stripeEventAt: 5_000,
      updatedAt: 9_000,
      stripeCustomerId: 'cus_1',
    })
  })

  it('turns sync off for an ended subscription', () => {
    expect(membershipFields(sub('canceled', 100), 0, 0).cloudSync).toBe(false)
  })

  it('omits the customer id when unknown (Firestore rejects undefined)', () => {
    const fields = membershipFields(sub('active', 100, { customer: null as unknown as string }), 0, 0)
    expect('stripeCustomerId' in fields).toBe(false)
  })
})
