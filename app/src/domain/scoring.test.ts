import { describe, expect, it } from 'vitest'
import {
  scoreRound,
  validateRound,
  checkCardSupply,
  gameTotals,
  gameResult,
  meldThreshold,
  sessionTallies,
  sessionWinner,
} from './scoring'
import { CANASTA_VALUES } from './constants'
import { makeEntry, makeRound } from './test-helpers'
import type { CanastaType, Game, Session } from './types'

describe('scoreRound — honors matrix', () => {
  it('both clean and dirty closed: 1-3 honors = 100 each', () => {
    for (const count of [1, 2, 3]) {
      const entry = makeEntry({ honors: count, canastas: { clean: 1, dirty: 1 } as Record<CanastaType, number> })
      expect(scoreRound(entry).honors).toBe(count * 100)
    }
  })

  it('both clean and dirty closed: 4+ honors = 200 each', () => {
    for (const count of [4, 5, 6, 7, 8]) {
      const entry = makeEntry({ honors: count, canastas: { clean: 1, dirty: 1 } as Record<CanastaType, number> })
      expect(scoreRound(entry).honors).toBe(count * 200)
    }
  })

  it('only clean closed (via patos-only): honors worth 0 regardless of count', () => {
    for (const count of [1, 4, 8]) {
      const entry = makeEntry({ honors: count, canastas: { cleanDeuce: 1 } as Record<CanastaType, number> })
      expect(scoreRound(entry).honors).toBe(0)
    }
  })

  it('only dirty closed (via dirty-aces-only): negative pattern', () => {
    const expected: Record<number, number> = {
      1: -200,
      2: -400,
      3: -600,
      4: -1_600,
      5: -2_000,
      6: -2_400,
      7: -2_800,
      8: -3_200,
    }
    for (const [count, value] of Object.entries(expected)) {
      const entry = makeEntry({
        honors: Number(count),
        canastas: { dirtyAce: 1 } as Record<CanastaType, number>,
      })
      expect(scoreRound(entry).honors).toBe(value)
    }
  })

  it('no canastas closed at all: same negative pattern as dirty-only', () => {
    const entry = makeEntry({ honors: 3 })
    expect(scoreRound(entry).honors).toBe(-600)
  })

  it('zero honors is always worth 0', () => {
    expect(scoreRound(makeEntry({ honors: 0, canastas: { clean: 1, dirty: 1 } as Record<CanastaType, number> })).honors).toBe(0)
  })
})

describe('scoreRound — canasta values', () => {
  it('sums each canasta type at its base value', () => {
    const entry = makeEntry({
      canastas: {
        clean: 2,
        dirty: 1,
        cleanAce: 1,
        dirtyAce: 1,
        cleanDeuce: 1,
        dirtyDeuce: 1,
        joker: 1,
        monkey: 1,
      },
    })
    const expected =
      2 * CANASTA_VALUES.clean +
      1 * CANASTA_VALUES.dirty +
      1 * CANASTA_VALUES.cleanAce +
      1 * CANASTA_VALUES.dirtyAce +
      1 * CANASTA_VALUES.cleanDeuce +
      1 * CANASTA_VALUES.dirtyDeuce +
      1 * CANASTA_VALUES.joker +
      1 * CANASTA_VALUES.monkey
    expect(scoreRound(entry).canastas).toBe(expected)
  })

  it('scores en-mano canastas at 2x the base value', () => {
    const entry = makeEntry({ canastasEnMano: { clean: 1 } as Record<CanastaType, number> })
    expect(scoreRound(entry).canastas).toBe(2 * CANASTA_VALUES.clean)
  })

  it('adds base and en-mano of the same type (n + 2n)', () => {
    const entry = makeEntry({
      canastas: { clean: 1 } as Record<CanastaType, number>,
      canastasEnMano: { clean: 1 } as Record<CanastaType, number>,
    })
    expect(scoreRound(entry).canastas).toBe(CANASTA_VALUES.clean + 2 * CANASTA_VALUES.clean)
  })

  it('counts en-mano canastas toward la ida clean/dirty requirement', () => {
    const entry = makeEntry({
      wentOut: true,
      canastasEnMano: { clean: 1, dirty: 1 } as Record<CanastaType, number>,
    })
    const result = scoreRound(entry)
    expect(result.goingOut).toBe(300)
    expect(result.violations).toEqual([])
  })

  it('counts en-mano canastas toward the canastón bonus', () => {
    const entry = makeEntry({
      canastas: { clean: 5 } as Record<CanastaType, number>,
      canastasEnMano: { clean: 4 } as Record<CanastaType, number>,
    })
    // 5 + 4 = 9 canastas -> Canastón bonus
    expect(scoreRound(entry).countBonus).toBe(3_000)
  })
})

describe('scoreRound — count bonus boundaries', () => {
  it.each([
    [8, 0],
    [9, 3_000],
    [11, 3_000],
    [12, 5_000],
    [13, 5_000],
  ])('total=%i canastas -> bonus=%i', (total, expectedBonus) => {
    const entry = makeEntry({ canastas: { clean: total } as Record<CanastaType, number> })
    expect(scoreRound(entry).countBonus).toBe(expectedBonus)
  })
})

describe('scoreRound — la ida validity', () => {
  it('valid when at least one clean AND one dirty canasta closed', () => {
    const entry = makeEntry({ wentOut: true, canastas: { clean: 1, dirty: 1 } as Record<CanastaType, number> })
    const result = scoreRound(entry)
    expect(result.goingOut).toBe(300)
    expect(result.violations).toEqual([])
  })

  it('invalid when only clean canastas closed', () => {
    const entry = makeEntry({ wentOut: true, canastas: { clean: 2 } as Record<CanastaType, number> })
    const result = scoreRound(entry)
    expect(result.goingOut).toBe(0)
    expect(result.violations).toContainEqual({ code: 'invalidIda' })
  })

  it('invalid when only dirty canastas closed', () => {
    const entry = makeEntry({ wentOut: true, canastas: { dirty: 2 } as Record<CanastaType, number> })
    const result = scoreRound(entry)
    expect(result.goingOut).toBe(0)
    expect(result.violations).toContainEqual({ code: 'invalidIda' })
  })

  it('adds the black-threes bonus only on a valid ida', () => {
    const entry = makeEntry({
      wentOut: true,
      blackThreesBonus: true,
      canastas: { clean: 1, dirty: 1 } as Record<CanastaType, number>,
    })
    expect(scoreRound(entry).goingOut).toBe(600)
  })

  it('flags the black-threes bonus without a valid ida', () => {
    const entry = makeEntry({ blackThreesBonus: true })
    const result = scoreRound(entry)
    expect(result.goingOut).toBe(0)
    expect(result.violations).toContainEqual({ code: 'blackThreesWithoutIda' })
  })

  it('flags both violations when black-threes bonus is claimed on an invalid ida', () => {
    const entry = makeEntry({
      wentOut: true,
      blackThreesBonus: true,
      canastas: { clean: 2 } as Record<CanastaType, number>,
    })
    const result = scoreRound(entry)
    expect(result.violations).toContainEqual({ code: 'invalidIda' })
    expect(result.violations).toContainEqual({ code: 'blackThreesWithoutIda' })
  })
})

describe('scoreRound — no-canastas negation', () => {
  it('negates melded points and hand points when no canasta closed', () => {
    const entry = makeEntry({
      honors: 1,
      meldedPoints: 240,
      handPoints: { p1: 35, p2: 50 },
    })
    const result = scoreRound(entry)
    expect(result.melded).toBe(-240)
    expect(result.hand).toBe(-85)
    expect(result.honors).toBe(-200)
    expect(result.total).toBe(-525)
  })

  it('keeps melded points positive when at least one canasta is closed', () => {
    const entry = makeEntry({
      meldedPoints: 100,
      canastas: { clean: 1 } as Record<CanastaType, number>,
    })
    expect(scoreRound(entry).melded).toBe(100)
  })
})

describe('scoreRound — cut and misdeal', () => {
  it('adds the exact-cut bonus', () => {
    expect(scoreRound(makeEntry({ exactCut: true })).cut).toBe(500)
  })

  it('applies the misdeal penalty', () => {
    expect(scoreRound(makeEntry({ misdeal: true })).misdeal).toBe(-500)
  })
})

describe('meldThreshold', () => {
  it.each([
    [-500, 50, true],
    [0, 50, true],
    [3_000, 50, true],
    [3_005, 90, false],
    [5_005, 120, false],
    [7_005, 160, false],
    [10_005, 180, false],
    [12_005, 200, false],
    [14_995, 200, false],
  ])('cumulative=%i -> points=%i, cleanOnly=%s', (cumulative, points, cleanOnly) => {
    expect(meldThreshold(cumulative)).toEqual({ points, cleanOnly })
  })
})

describe('validateRound — cross-team checks', () => {
  const playerCount = 4

  it('flags honors sum over the max for the player count', () => {
    const round = makeRound({
      A: makeEntry({ honors: 4, canastas: { clean: 1, dirty: 1 } as Record<CanastaType, number> }),
      B: makeEntry({ honors: 3, canastas: { clean: 1, dirty: 1 } as Record<CanastaType, number> }),
    })
    const result = validateRound(round, playerCount)
    expect(result.valid).toBe(false)
    expect(result.violations).toContainEqual({ code: 'honorsSumOverMax' })
  })

  it('flags a single team going over the max honors on its own', () => {
    const round = makeRound({
      A: makeEntry({ honors: 7 }),
      B: makeEntry({ honors: 0 }),
    })
    const result = validateRound(round, playerCount)
    expect(result.violations).toContainEqual({ team: 'A', code: 'honorsOverMax' })
  })

  it('flags both teams going out in the same round', () => {
    const round = makeRound({
      A: makeEntry({ wentOut: true, canastas: { clean: 1, dirty: 1 } as Record<CanastaType, number> }),
      B: makeEntry({ wentOut: true, canastas: { clean: 1, dirty: 1 } as Record<CanastaType, number> }),
    })
    const result = validateRound(round, playerCount)
    expect(result.valid).toBe(false)
    expect(result.violations).toContainEqual({ code: 'multipleWentOut' })
  })

  it('flags both teams claiming exact cut', () => {
    const round = makeRound({ A: makeEntry({ exactCut: true }), B: makeEntry({ exactCut: true }) })
    expect(validateRound(round, playerCount).violations).toContainEqual({ code: 'multipleExactCut' })
  })

  it('flags both teams claiming a misdeal', () => {
    const round = makeRound({ A: makeEntry({ misdeal: true }), B: makeEntry({ misdeal: true }) })
    expect(validateRound(round, playerCount).violations).toContainEqual({ code: 'multipleMisdeal' })
  })

  it('is valid for an ordinary, well-formed round', () => {
    const round = makeRound({
      A: makeEntry({ exactCut: true, honors: 2, canastas: { clean: 1, dirty: 1 } as Record<CanastaType, number> }),
      B: makeEntry({ honors: 1 }),
    })
    expect(validateRound(round, playerCount).valid).toBe(true)
  })
})

describe('checkCardSupply', () => {
  it('is silent for an ordinary round with no rank-locked canastas', () => {
    const round = makeRound({
      A: makeEntry({ canastas: { clean: 1, dirty: 1 } as Record<CanastaType, number> }),
      B: makeEntry(),
    })
    expect(checkCardSupply(round, 4)).toEqual([])
  })

  it('is silent for a single clean ace canasta (7 of 12 aces, 4p)', () => {
    const round = makeRound({ A: makeEntry({ canastas: { cleanAce: 1 } as Record<CanastaType, number> }), B: makeEntry() })
    expect(checkCardSupply(round, 4)).toEqual([])
  })

  it('flags two clean ace canastas across teams in a 4p game (14 > 12 aces)', () => {
    const round = makeRound({
      A: makeEntry({ canastas: { cleanAce: 1 } as Record<CanastaType, number> }),
      B: makeEntry({ canastas: { cleanAce: 1 } as Record<CanastaType, number> }),
    })
    expect(checkCardSupply(round, 4)).toContainEqual({ code: 'aceSupplyExceeded' })
  })

  it('does not flag the same two clean ace canastas in a 6p game (14 <= 16 aces)', () => {
    const round = makeRound({
      A: makeEntry({ canastas: { cleanAce: 1 } as Record<CanastaType, number> }),
      B: makeEntry({ canastas: { cleanAce: 1 } as Record<CanastaType, number> }),
    })
    expect(checkCardSupply(round, 6)).toEqual([])
  })

  it('flags three clean ace canastas in a 6p game (21 > 16 aces)', () => {
    const round = makeRound({
      A: makeEntry({ canastas: { cleanAce: 2 } as Record<CanastaType, number> }),
      B: makeEntry({ canastas: { cleanAce: 1 } as Record<CanastaType, number> }),
    })
    expect(checkCardSupply(round, 6)).toContainEqual({ code: 'aceSupplyExceeded' })
  })

  it('flags a team with both a clean and a dirty ace canasta, independent of supply', () => {
    const round = makeRound({
      A: makeEntry({ canastas: { cleanAce: 1, dirtyAce: 1 } as Record<CanastaType, number> }),
      B: makeEntry(),
    })
    const warnings = checkCardSupply(round, 4)
    expect(warnings).toContainEqual({ team: 'A', code: 'bothAceVariantsSameTeam' })
    // Exactly 12 aces needed (7 clean + 5 dirty) against 12 available: not a supply violation on its own.
    expect(warnings).not.toContainEqual({ code: 'aceSupplyExceeded' })
  })

  it('flags two clean deuce canastas across teams in a 4p game (14 > 12 deuces)', () => {
    const round = makeRound({
      A: makeEntry({ canastas: { cleanDeuce: 1 } as Record<CanastaType, number> }),
      B: makeEntry({ canastas: { cleanDeuce: 1 } as Record<CanastaType, number> }),
    })
    expect(checkCardSupply(round, 4)).toContainEqual({ code: 'deuceSupplyExceeded' })
  })

  it('counts each joker canasta as also consuming one deuce', () => {
    const round = makeRound({
      A: makeEntry({ canastas: { cleanDeuce: 1, joker: 1 } as Record<CanastaType, number> }), // 7 + 1 = 8 deuces
      B: makeEntry({ canastas: { cleanDeuce: 1 } as Record<CanastaType, number> }), // 7 deuces
    })
    // 15 deuces needed > 12 available in a 4p game.
    expect(checkCardSupply(round, 4)).toContainEqual({ code: 'deuceSupplyExceeded' })
  })

  it('is silent for a single joker canasta (6 of 6 jokers, 4p — exactly enough)', () => {
    const round = makeRound({ A: makeEntry({ canastas: { joker: 1 } as Record<CanastaType, number> }), B: makeEntry() })
    expect(checkCardSupply(round, 4)).toEqual([])
  })

  it('flags two joker canastas even in a 6p game (12 > 8 jokers)', () => {
    const round = makeRound({
      A: makeEntry({ canastas: { joker: 1 } as Record<CanastaType, number> }),
      B: makeEntry({ canastas: { joker: 1 } as Record<CanastaType, number> }),
    })
    expect(checkCardSupply(round, 6)).toContainEqual({ code: 'jokerSupplyExceeded' })
  })
})

function makeGame(rounds: ReturnType<typeof makeRound>[]): Game {
  return {
    partnership: { A: ['p1', 'p2'], B: ['p3', 'p4'], C: [] },
    dealerId: 'p2',
    manoId: 'p1',
    rounds,
  }
}

describe('gameTotals / gameResult', () => {
  it('sums round totals per team', () => {
    const round = makeRound({
      A: makeEntry({ canastas: { clean: 1 } as Record<CanastaType, number> }), // 500
      B: makeEntry({ canastas: { dirty: 1 } as Record<CanastaType, number> }), // 300
    })
    const totals = gameTotals(makeGame([round, round]))
    expect(totals.A).toBe(1_000)
    expect(totals.B).toBe(600)
  })

  it('declares a winner once one team crosses the game target', () => {
    const round = makeRound({
      A: makeEntry({ meldedPoints: 15_000, canastas: { clean: 1 } as Record<CanastaType, number> }),
      B: makeEntry(),
    })
    const result = gameResult(makeGame([round]))
    expect(result).toEqual({ finished: true, winner: 'A' })
  })

  it('is not finished when neither team has reached the target', () => {
    const round = makeRound({ A: makeEntry({ meldedPoints: 100, canastas: { clean: 1 } as Record<CanastaType, number> }), B: makeEntry() })
    expect(gameResult(makeGame([round])).finished).toBe(false)
  })

  it('plays another round when both teams tie above the target', () => {
    const round = makeRound({
      A: makeEntry({ meldedPoints: 15_000, canastas: { clean: 1 } as Record<CanastaType, number> }),
      B: makeEntry({ meldedPoints: 15_000, canastas: { clean: 1 } as Record<CanastaType, number> }),
    })
    expect(gameResult(makeGame([round]))).toEqual({ finished: false })
  })

  it('picks the higher score when both cross but are not tied', () => {
    const round = makeRound({
      A: makeEntry({ meldedPoints: 15_500, canastas: { clean: 1 } as Record<CanastaType, number> }),
      B: makeEntry({ meldedPoints: 15_000, canastas: { clean: 1 } as Record<CanastaType, number> }),
    })
    expect(gameResult(makeGame([round]))).toEqual({ finished: true, winner: 'A' })
  })
})

describe('sessionTallies / sessionWinner', () => {
  function makeSession(games: Game[]): Session {
    return {
      id: 's1',
      date: '2026-01-01',
      playerCount: 4,
      players: [
        { id: 'p1', name: 'Ana' },
        { id: 'p2', name: 'Caro' },
        { id: 'p3', name: 'Beto' },
        { id: 'p4', name: 'Dani' },
      ],
      manoId: 'p1',
      initialDealerId: 'p2',
      plannedGames: 3,
      games,
      status: 'in_progress',
    }
  }

  it('attributes each game team total to its member players', () => {
    const round = makeRound({
      A: makeEntry({ canastas: { clean: 1 } as Record<CanastaType, number> }), // 500
      B: makeEntry({ canastas: { dirty: 1 } as Record<CanastaType, number> }), // 300
    })
    const session = makeSession([makeGame([round])])
    expect(sessionTallies(session)).toEqual({ p1: 500, p2: 500, p3: 300, p4: 300 })
  })

  it('returns every tied player as the session winner', () => {
    const round = makeRound({
      A: makeEntry({ canastas: { clean: 1 } as Record<CanastaType, number> }),
      B: makeEntry({ canastas: { clean: 1 } as Record<CanastaType, number> }),
    })
    const session = makeSession([makeGame([round])])
    expect(sessionWinner(session).sort()).toEqual(['p1', 'p2', 'p3', 'p4'].sort())
  })

  it('returns a single winner when tallies differ', () => {
    const round = makeRound({
      A: makeEntry({ canastas: { clean: 2 } as Record<CanastaType, number> }),
      B: makeEntry({ canastas: { dirty: 1 } as Record<CanastaType, number> }),
    })
    const session = makeSession([makeGame([round])])
    expect(sessionWinner(session).sort()).toEqual(['p1', 'p2'].sort())
  })
})
