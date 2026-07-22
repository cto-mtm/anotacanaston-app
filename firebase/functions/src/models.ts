import { z } from 'zod'

export const echoSchema = z.object({
  message: z.string().min(1),
  name: z.string().optional(),
})

export type EchoBody = z.infer<typeof echoSchema>
