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
])

export const canastasSchema = z.object({
  clean: z.number().int().min(0),
  dirty: z.number().int().min(0),
  cleanAce: z.number().int().min(0),
  dirtyAce: z.number().int().min(0),
  cleanDeuce: z.number().int().min(0),
  dirtyDeuce: z.number().int().min(0),
  joker: z.number().int().min(0),
})

export const cardCountsSchema = z.object({
  joker: z.number().int().min(0),
  aceOrDeuce: z.number().int().min(0),
  high: z.number().int().min(0),
  low: z.number().int().min(0),
})

export const teamRoundEntrySchema = z.object({
  exactCut: z.boolean(),
  misdeal: z.boolean(),
  badMelds: z.number().int().min(0),
  tableTalk: z.number().int().min(0),
  honors: z.number().int().min(0),
  canastas: canastasSchema,
  canastasEnMano: canastasSchema,
  wentOut: z.boolean(),
  blackThreesBonus: z.boolean(),
  meldedPoints: z.number().int().min(0),
  handPoints: z.record(playerIdSchema, z.number().int().min(0)),
  // Optional card breakdowns — rounds saved before the card counter lack them.
  meldedCards: cardCountsSchema.optional(),
  handCards: z.record(playerIdSchema, cardCountsSchema).optional(),
})

export const roundSchema = z.object({
  // Rounds saved before ids existed get one on load (persisted on the next write).
  id: z.string().min(1).default(() => crypto.randomUUID()),
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

export const houseRulesSchema = z.object({
  canastaValues: z.object({
    clean: z.number().int().min(0),
    dirty: z.number().int().min(0),
    cleanAce: z.number().int().min(0),
    dirtyAce: z.number().int().min(0),
    cleanDeuce: z.number().int().min(0),
    dirtyDeuce: z.number().int().min(0),
    joker: z.number().int().min(0),
  }),
  canastonThreshold: z.number().int().positive(),
  canastonBonus: z.number().int().min(0),
  superCanastonThreshold: z.number().int().positive(),
  superCanastonBonus: z.number().int().min(0),
  penaltyValue: z.number().int().min(0),
  gameTarget: z.number().int().positive(),
  sessionScoring: z.enum(['roundedThousands', 'rawPoints']),
})

export const playerSchema = z.object({
  id: playerIdSchema,
  name: z.string().min(1),
})

export const sessionSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  // Sessions saved before this field existed sort as oldest among same-date ones.
  createdAt: z.number().default(0),
  playerCount: z.union([z.literal(4), z.literal(6)]),
  sixPlayerFormat: z.enum(['2x3', '3x2']).optional(),
  players: z.array(playerSchema),
  manoId: playerIdSchema,
  initialDealerId: playerIdSchema,
  plannedGames: z.number().int().positive(),
  rules: houseRulesSchema,
  games: z.array(gameSchema),
  status: z.enum(['in_progress', 'finished']),
  endedEarly: z.boolean().optional(),
})
