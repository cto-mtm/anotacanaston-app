import { describe, expect, it } from 'vitest'
import { capabilitiesFor, deriveMembership, type UserDoc } from './membership'

describe('deriveMembership', () => {
  it('is anonymous when nobody is signed in, whatever the doc says', () => {
    expect(deriveMembership(false, { subscriptionStatus: 'active' })).toBe('anonymous')
  })

  it('is checking until the first users/{uid} snapshot arrives', () => {
    expect(deriveMembership(true, undefined)).toBe('checking')
  })

  it('is free with no doc, or a doc without a subscription', () => {
    expect(deriveMembership(true, null)).toBe('free')
    expect(deriveMembership(true, {})).toBe('free')
    expect(deriveMembership(true, { subscriptionStatus: 'incomplete' })).toBe('free')
  })

  it.each([
    ['active', 'member'],
    ['trialing', 'member'],
    ['past_due', 'graceful'],
    ['canceled', 'lapsed'],
    ['unpaid', 'lapsed'],
    ['incomplete_expired', 'lapsed'],
    ['paused', 'lapsed'],
  ])('subscription %s → %s', (subscriptionStatus, expected) => {
    expect(deriveMembership(true, { subscriptionStatus })).toBe(expected)
  })
})

describe('capabilitiesFor', () => {
  const customer: UserDoc = { subscriptionStatus: 'active', stripeCustomerId: 'cus_1' }

  it('syncs for members and during the past_due grace period', () => {
    expect(capabilitiesFor('member', customer, false).canSync).toBe(true)
    expect(capabilitiesFor('graceful', customer, false)).toMatchObject({ canSync: true, needsCardUpdate: true })
    expect(capabilitiesFor('lapsed', customer, false).canSync).toBe(false)
  })

  it('offers subscribing to non-members on the web, never while checking or in the apps', () => {
    expect(capabilitiesFor('free', null, false).canSubscribe).toBe(true)
    expect(capabilitiesFor('lapsed', customer, false).canSubscribe).toBe(true)
    expect(capabilitiesFor('anonymous', undefined, false).canSubscribe).toBe(true)
    expect(capabilitiesFor('checking', undefined, false).canSubscribe).toBe(false)
    expect(capabilitiesFor('member', customer, false).canSubscribe).toBe(false)
    expect(capabilitiesFor('free', null, true).canSubscribe).toBe(false)
  })

  it('offers billing management only with a Stripe customer, on the web', () => {
    expect(capabilitiesFor('lapsed', customer, false).canManageBilling).toBe(true)
    expect(capabilitiesFor('free', null, false).canManageBilling).toBe(false)
    expect(capabilitiesFor('member', customer, true).canManageBilling).toBe(false)
  })
})
