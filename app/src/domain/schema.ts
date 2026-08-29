import { z } from 'zod'

export const playerIdSchema = z.string().min(1)

export const canastaTypeSchema = z.enum([
  'clean',
  'dirty',
  'cleanAce',
  'dirtyAce',
  'cleanDeuce',
  'dirtyDeuce',
  'joker',
  'monkey',
])

export const canastasSchema = z.object({
  clean: z.number().int().min(0),
  dirty: z.number().int().min(0),
  cleanAce: z.number().int().min(0),
  dirtyAce: z.number().int().min(0),
  cleanDeuce: z.number().int().min(0),
  dirtyDeuce: z.number().int().min(0),
  joker: z.number().int().min(0),
  monkey: z.number().int().min(0),
})

export const teamRoundEntrySchema = z.object({
  exactCut: z.boolean(),
  misdeal: z.boolean(),
  honors: z.number().int().min(0),
  canastas: canastasSchema,
  canastasEnMano: canastasSchema.default({
    clean: 0,
    dirty: 0,
    cleanAce: 0,
    dirtyAce: 0,
    cleanDeuce: 0,
    dirtyDeuce: 0,
    joker: 0,
    monkey: 0,
  }),
  wentOut: z.boolean(),
  blackThreesBonus: z.boolean(),
  meldedPoints: z.number().int().min(0),
  handPoints: z.record(playerIdSchema, z.number().int().min(0)),
})

export const roundSchema = z.object({
  entries: z.object({
    A: teamRoundEntrySchema,
    B: teamRoundEntrySchema,
    C: teamRoundEntrySchema,
  }),
})

export const gameSchema = z.object({
  partnership: z.object({
    A: z.array(playerIdSchema),
    B: z.array(playerIdSchema),
    C: z.array(playerIdSchema),
  }),
  dealerId: playerIdSchema,
  manoId: playerIdSchema,
  rounds: z.array(roundSchema),
})

export const playerSchema = z.object({
  id: playerIdSchema,
  name: z.string().min(1),
})

export const sessionSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  playerCount: z.union([z.literal(4), z.literal(6)]),
  sixPlayerFormat: z.enum(['2x3', '3x2']).optional(),
  players: z.array(playerSchema),
  manoId: playerIdSchema,
  initialDealerId: playerIdSchema,
  plannedGames: z.number().int().positive(),
  games: z.array(gameSchema),
  status: z.enum(['in_progress', 'finished']),
})
