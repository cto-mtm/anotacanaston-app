import { z } from 'zod'

export const echoSchema = z.object({
  message: z.string().min(1),
  name: z.string().optional(),
})

export type EchoBody = z.infer<typeof echoSchema>

// Body for POST /billing/create-checkout-session. The caller supplies where to
// return to; the uid comes from the verified Firebase ID token, never the body.
export const createCheckoutSchema = z.object({
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

export type CreateCheckoutBody = z.infer<typeof createCheckoutSchema>
