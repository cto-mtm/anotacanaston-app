import { useI18n } from 'vue-i18n'
import { ALL_CANASTA_TYPES, CARD_GROUPS } from '../domain/constants'
import type { RoundScoreBreakdown } from '../domain/scoring'
import type { CardCounts, Player, TeamRoundEntry } from '../domain/types'

import type { RoundSectionKey } from '../lib/roundFlow'

export { ALL_SECTIONS, FLOW_SECTIONS, type FlowSectionKey, type RoundSectionKey } from '../lib/roundFlow'

export interface SectionLine {
  /** What was entered, human readable ("2 Limpia · 1 Sucia (mano)"). */
  summary: string
  /** What it is worth this round. */
  points: number
  /** Whether anything was entered at all — empty lines are hidden in the review. */
  filled: boolean
}

/** Signed, locale-formatted points: +1.300 / −85 / 0. */
export function formatPoints(points: number, n: (value: number) => string): string {
  if (points > 0) return `+${n(points)}`
  if (points < 0) return `−${n(-points)}`
  return '0'
}

export function useRoundLines() {
  const { t, n } = useI18n()

  function cardsSummary(cards: CardCounts): string {
    return CARD_GROUPS.filter((g) => cards[g] > 0)
      .map((g) => `${cards[g]} ${t(`roundEntry.cardGroupsShort.${g}`)}`)
      .join(' · ')
  }

  function canastasSummary(entry: TeamRoundEntry): string {
    const parts: string[] = []
    for (const type of ALL_CANASTA_TYPES) {
      const label = t(`roundEntry.canastaShort.${type}`)
      if (entry.canastas[type]) parts.push(`${entry.canastas[type]} ${label}`)
      if (entry.canastasEnMano[type]) parts.push(`${entry.canastasEnMano[type]} ${label} (${t('roundEntry.enManoTag')})`)
    }
    return parts.join(' · ') || t('roundEntry.none')
  }

  function extrasSummary(entry: TeamRoundEntry): string {
    const parts: string[] = []
    if (entry.exactCut) parts.push(t('game.exactCut'))
    if (entry.misdeal) parts.push(t('game.misdeal'))
    if (entry.badMelds) parts.push(`${t('roundEntry.badMeldsShort')} ×${entry.badMelds}`)
    if (entry.tableTalk) parts.push(`${t('roundEntry.tableTalkShort')} ×${entry.tableTalk}`)
    return parts.join(' · ') || t('roundEntry.none')
  }

  function extrasCount(entry: TeamRoundEntry): number {
    return Number(entry.exactCut) + Number(entry.misdeal) + entry.badMelds + entry.tableTalk
  }

  function sectionLines(
    entry: TeamRoundEntry,
    breakdown: RoundScoreBreakdown,
    players: Player[],
  ): Record<RoundSectionKey, SectionLine> {
    const canastaCount = ALL_CANASTA_TYPES.reduce((s, c) => s + entry.canastas[c] + entry.canastasEnMano[c], 0)
    const handTotal = players.reduce((s, p) => s + (entry.handPoints[p.id] ?? 0), 0)
    return {
      canastas: {
        summary: canastasSummary(entry),
        points: breakdown.canastas + breakdown.countBonus,
        filled: canastaCount > 0,
      },
      honors: {
        summary: entry.honors ? n(entry.honors) : t('roundEntry.none'),
        points: breakdown.honors,
        filled: entry.honors > 0,
      },
      melded: {
        summary: entry.meldedCards ? cardsSummary(entry.meldedCards) || t('roundEntry.none') : n(entry.meldedPoints),
        points: breakdown.melded,
        filled: entry.meldedPoints > 0,
      },
      hand: {
        summary: players.map((p) => `${p.name} ${n(entry.handPoints[p.id] ?? 0)}`).join(' · '),
        points: breakdown.hand,
        filled: handTotal > 0,
      },
      extras: {
        summary: extrasSummary(entry),
        points: breakdown.cut + breakdown.misdeal + breakdown.penalties,
        filled: extrasCount(entry) > 0,
      },
    }
  }

  return { sectionLines, extrasCount, formatPoints: (points: number) => formatPoints(points, n) }
}
