import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
// import { defineSecret } from 'firebase-functions/params'
import { applyCors } from './helpers/cors.js'
import { echoSchema } from './models.js'
import { ZodError } from 'zod'

// Example of how to add a secret later — don't define real ones here:
// const exampleSecret = defineSecret('EXAMPLE_SECRET')

const VALID_ROUTES = ['GET /health', 'POST /echo']

export const api = onRequest(
  { region: 'us-central1', maxInstances: 10 },
  (req, res) => {
    if (applyCors(req, res)) return

    const path = req.path.replace(/\/+$/, '') || '/'

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

    res.status(404).json({ error: 'not found', validRoutes: VALID_ROUTES })
  },
)
