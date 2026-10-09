// Membership (Club subscription) as a pure function of two inputs: who is
// signed in, and the server-written users/{uid} document. Nothing here talks
// to Firebase or Stripe — stores/membership.ts feeds the inputs, the UI reads
// the capabilities. See docs/plans/membership-and-storage.md §1.

import { z } from 'zod'

/** users/{uid}, written only by the Stripe webhook (firebase/functions/src/helpers/billing.ts). */
export const userDocSchema = z.object({
  cloudSync: z.boolean().optional(),
  subscriptionStatus: z.string().optional(),
  memberSince: z.number().optional(),
  currentPeriodEnd: z.number().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  stripeCustomerId: z.string().optional(),
})
export type UserDoc = z.infer<typeof userDocSchema>

export type MembershipStatus =
  | 'anonymous' // not signed in
  | 'checking' // signed in, first users/{uid} snapshot not received yet
  | 'free' // signed in, never subscribed
  | 'member' // active / trialing
  | 'graceful' // past_due — Stripe is retrying the card; sync stays on
  | 'lapsed' // was a member; subscription ended

/** `undefined` = still loading; `null` = the document doesn't exist. */
export type UserDocState = UserDoc | null | undefined

export function deriveMembership(signedIn: boolean, doc: UserDocState): MembershipStatus {
  if (!signedIn) return 'anonymous'
  if (doc === undefined) return 'checking'
  if (doc === null || !doc.subscriptionStatus) return 'free'
  switch (doc.subscriptionStatus) {
    case 'active':
    case 'trialing':
      return 'member'
    case 'past_due':
      return 'graceful'
    // `incomplete` = the first payment hasn't gone through yet: not a member.
    case 'incomplete':
      return 'free'
    default:
      // canceled, unpaid, incomplete_expired, paused
      return 'lapsed'
  }
}

export interface MembershipCapabilities {
  /** Games live in the cloud (Firestore) instead of only on this device. */
  canSync: boolean
  /** Show the subscribe CTA (web only — store rules forbid it in the apps). */
  canSubscribe: boolean
  /** Show "Gestionar suscripción" (Stripe portal, web only). */
  canManageBilling: boolean
  /** Card failed; nudge to update it. */
  needsCardUpdate: boolean
}

export function capabilitiesFor(status: MembershipStatus, doc: UserDocState, isNative: boolean): MembershipCapabilities {
  const syncing = status === 'member' || status === 'graceful'
  return {
    canSync: syncing,
    canSubscribe: !isNative && !syncing && status !== 'checking',
    canManageBilling: !isNative && Boolean(doc?.stripeCustomerId),
    needsCardUpdate: status === 'graceful',
  }
}
