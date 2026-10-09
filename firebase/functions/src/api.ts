import { onRequest, type Request } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { applyCors } from './helpers/cors.js'
import { adminAuth } from './helpers/admin.js'
import {
  AlreadySubscribedError,
  NoCustomerError,
  createCheckoutSession,
  createPortalSession,
  deleteAccount,
  getClubPriceInfo,
  handleWebhook,
  stripeSecret,
  stripeWebhookSecret,
} from './helpers/billing.js'
import { createCheckoutSchema, createPortalSchema, echoSchema } from './models.js'
import { ZodError } from 'zod'

const VALID_ROUTES = [
  'GET /health',
  'POST /echo',
  'GET /billing/price',
  'POST /billing/create-checkout-session',
  'POST /billing/portal',
  'POST /billing/webhook',
  'POST /account/delete',
]

/** Verifies the Firebase ID token from the Authorization header. */
async function requireUser(req: Request): Promise<{ uid: string; email?: string } | null> {
  const header = req.headers.authorization
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null
  try {
    const decoded = await adminAuth.verifyIdToken(header.slice('Bearer '.length))
    return { uid: decoded.uid, email: decoded.email }
  } catch {
    return null
  }
}

export const api = onRequest(
  { region: 'us-central1', maxInstances: 10, secrets: [stripeSecret, stripeWebhookSecret] },
  async (req, res) => {
    const path = req.path.replace(/\/+$/, '') || '/'

    // ── Stripe webhook: must run BEFORE CORS and reads the raw body for
    // signature verification. Stripe calls server-to-server (no Origin).
    if (req.method === 'POST' && path === '/billing/webhook') {
      const signature = req.headers['stripe-signature']
      if (typeof signature !== 'string') {
        res.status(400).json({ error: 'missing stripe-signature' })
        return
      }
      try {
        const status = await handleWebhook(req.rawBody, signature)
        logger.info('stripe webhook', { status })
        res.json({ received: true })
      } catch (err) {
        logger.error('stripe webhook failed', err)
        res.status(400).json({ error: 'webhook verification failed' })
      }
      return
    }

    if (applyCors(req, res)) return

    if (req.method === 'GET' && path === '/health') {
      logger.info('health check')
      res.json({ ok: true, ts: new Date().toISOString() })
      return
    }

    if (req.method === 'POST' && path === '/echo') {
      try {
        const parsed = echoSchema.parse(req.body)
        res.json({ success: true, echoed: parsed })
      } catch (err) {
        if (err instanceof ZodError) {
          res.status(400).json({ error: err.flatten() })
          return
        }
        throw err
      }
      return
    }

    // ── Club price for display (public; no auth) ─────────────────────
    if (req.method === 'GET' && path === '/billing/price') {
      try {
        res.json(await getClubPriceInfo())
      } catch (err) {
        logger.error('billing price lookup failed', err)
        res.status(500).json({ error: 'price unavailable' })
      }
      return
    }

    // ── Create a Stripe Checkout Session for the signed-in user ──────
    if (req.method === 'POST' && path === '/billing/create-checkout-session') {
      const user = await requireUser(req)
      if (!user) {
        res.status(401).json({ error: 'unauthenticated' })
        return
      }
      try {
        const body = createCheckoutSchema.parse(req.body)
        const url = await createCheckoutSession(user.uid, user.email, body.successUrl, body.cancelUrl)
        res.json({ url })
      } catch (err) {
        if (err instanceof ZodError) {
          res.status(400).json({ error: err.flatten() })
          return
        }
        if (err instanceof AlreadySubscribedError) {
          res.status(409).json({ error: 'already subscribed' })
          return
        }
        logger.error('create-checkout-session failed', err)
        res.status(500).json({ error: 'could not create checkout session' })
      }
      return
    }

    // ── Stripe Customer Portal: cancel / change card / invoices ──────
    if (req.method === 'POST' && path === '/billing/portal') {
      const user = await requireUser(req)
      if (!user) {
        res.status(401).json({ error: 'unauthenticated' })
        return
      }
      try {
        const body = createPortalSchema.parse(req.body)
        res.json({ url: await createPortalSession(user.uid, body.returnUrl) })
      } catch (err) {
        if (err instanceof ZodError) {
          res.status(400).json({ error: err.flatten() })
          return
        }
        if (err instanceof NoCustomerError) {
          res.status(409).json({ error: 'no subscription' })
          return
        }
        logger.error('billing portal failed', err)
        res.status(500).json({ error: 'could not open billing portal' })
      }
      return
    }

    // ── Delete the signed-in user's account and cloud data ───────────
    if (req.method === 'POST' && path === '/account/delete') {
      const user = await requireUser(req)
      if (!user) {
        res.status(401).json({ error: 'unauthenticated' })
        return
      }
      try {
        await deleteAccount(user.uid)
        res.json({ deleted: true })
      } catch (err) {
        logger.error('account deletion failed', err)
        res.status(500).json({ error: 'could not delete account' })
      }
      return
    }

    res.status(404).json({ error: 'not found', validRoutes: VALID_ROUTES })
  },
)
