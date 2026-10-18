<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSessionsStore } from '../stores/sessions'
import { scoreRound, validateRound, checkCardSupply } from '../domain/scoring'
import { ALL_CANASTA_TYPES, MAX_HONORS, emptyCardCounts, teamsForGame } from '../domain/constants'
import TeamRoundAccordion from '../components/round/TeamRoundAccordion.vue'
import RoundReview from '../components/round/RoundReview.vue'
import BaseButton from '../components/BaseButton.vue'
import { useRoundLines } from '../composables/useRoundLines'
import {
  allVisitKeys,
  buildSteps,
  currentStepIndex as flowStepIndex,
  firstTodoStep,
  isSectionVisited,
  visitKey,
  type RoundSectionKey,
} from '../lib/roundFlow'
import type { CanastaType, Player, PlayerId, TeamId, TeamRoundEntry } from '../domain/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { formatPoints } = useRoundLines()
const sessionsStore = useSessionsStore()

const sessionId = computed(() => route.params.id as string)
const gameIndex = computed(() => Number(route.params.g))
const isEdit = computed(() => route.name === 'round-edit')
const roundIndex = computed(() => Number(route.params.r))

const session = computed(() => sessionsStore.findSession(sessionId.value))
const game = computed(() => session.value?.games[gameIndex.value])
const teams = computed(() => (game.value ? teamsForGame(game.value.partnership) : (['A', 'B'] as TeamId[])))
const rules = computed(() => sessionsStore.getSessionRules(sessionId.value))
const playerCount = computed(() => session.value?.playerCount ?? 4)
const maxHonors = computed(() => MAX_HONORS[playerCount.value])
const roundNumber = computed(() => (isEdit.value ? roundIndex.value + 1 : (game.value?.rounds.length ?? 0) + 1))

function makeEmptyEntry(playerIds: PlayerId[]): TeamRoundEntry {
  const canastas = Object.fromEntries(ALL_CANASTA_TYPES.map((c) => [c, 0])) as Record<CanastaType, number>
  const canastasEnMano = Object.fromEntries(ALL_CANASTA_TYPES.map((c) => [c, 0])) as Record<CanastaType, number>
  const handPoints = Object.fromEntries(playerIds.map((id) => [id, 0]))
  return {
    exactCut: false,
    misdeal: false,
    badMelds: 0,
    tableTalk: 0,
    honors: 0,
    canastas,
    canastasEnMano,
    wentOut: false,
    blackThreesBonus: false,
    meldedPoints: 0,
    handPoints,
    // New rounds count hand cards by default — few cards, easy to verify.
    handCards: Object.fromEntries(playerIds.map((id) => [id, emptyCardCounts()])),
  }
}

// The store's round entries are Vue reactive proxies — structuredClone
// can't clone those directly, so plain JSON round-trip both clones and
// unwraps reactivity (TeamRoundEntry is plain JSON-safe data).
function cloneEntry(entry: TeamRoundEntry): TeamRoundEntry {
  return JSON.parse(JSON.stringify(entry))
}

// The draft is filled once, as soon as the game (and, when editing, the
// round) is available — on a refresh or app restore the session may still be
// loading from the cloud when this page mounts. Until then nothing is shown
// and nothing can be saved, so an empty draft can never overwrite a round.
const loaded = ref(false)
/** The round being edited, captured once: saving targets it by id, not position. */
let editingRoundId: string | undefined

const entries = ref<Record<TeamId, TeamRoundEntry>>({
  A: makeEmptyEntry([]),
  B: makeEmptyEntry([]),
  C: makeEmptyEntry([]),
})

const roundMissing = computed(
  () => isEdit.value && !loaded.value && game.value !== undefined && !game.value.rounds[roundIndex.value],
)

const breakdowns = computed(() => {
  const result: Partial<Record<TeamId, ReturnType<typeof scoreRound>>> = {}
  for (const team of teams.value) result[team] = scoreRound(entries.value[team], rules.value)
  return result as Record<TeamId, ReturnType<typeof scoreRound>>
})

const validation = computed(() =>
  validateRound({ entries: entries.value }, playerCount.value, rules.value, teams.value),
)

// Non-blocking: heads-up that a canasta combination looks off given the deck in play.
const cardSupplyWarnings = computed(() =>
  checkCardSupply({ entries: entries.value }, playerCount.value, teams.value),
)

function playersFor(team: TeamId): Player[] {
  const ids = game.value?.partnership[team] ?? []
  return ids.map((id) => session.value?.players.find((p) => p.id === id)).filter((p): p is Player => Boolean(p))
}

const playersByTeam = computed(() => {
  const result = { A: [], B: [], C: [] } as Record<TeamId, Player[]>
  for (const team of teams.value) result[team] = playersFor(team)
  return result
})

function teamLabel(team: TeamId) {
  return t(`game.team.${team}`)
}

// ── ENTRY UPDATES ───────────────────────────────────────────────
// Exact cut and misdeal can only belong to one team per round: setting
// one clears it from the others instead of raising a violation later.
function updateEntry(team: TeamId, next: TeamRoundEntry) {
  const prev = entries.value[team]
  entries.value[team] = next
  for (const flag of ['exactCut', 'misdeal'] as const) {
    if (!next[flag] || prev[flag]) continue
    for (const other of teams.value) {
      if (other !== team && entries.value[other][flag]) entries.value[other] = { ...entries.value[other], [flag]: false }
    }
  }
}

// "Who went out?" is one question for the whole round.
const wentOutTeam = computed<TeamId | null>(() => teams.value.find((team) => entries.value[team].wentOut) ?? null)

function setWentOut(team: TeamId | null) {
  for (const other of teams.value) {
    const entry = entries.value[other]
    const wentOut = other === team
    entries.value[other] = { ...entry, wentOut, blackThreesBonus: wentOut ? entry.blackThreesBonus : false }
  }
}

function setBlackThrees(value: boolean) {
  if (wentOutTeam.value) entries.value[wentOutTeam.value] = { ...entries.value[wentOutTeam.value], blackThreesBonus: value }
}

const wentOutInvalid = computed(() =>
  wentOutTeam.value ? breakdowns.value[wentOutTeam.value].violations.some((v) => v.code === 'invalidIda') : false,
)

// ── GUIDED FLOW ─────────────────────────────────────────────────
// One section open at a time. "Next" walks the table-talk order
// (canastas → honors → melded → each player's hand → next team → review);
// any section can also be opened directly by tapping it.
const activeTeam = ref<TeamId>(teams.value[0])
const openSection = ref<RoundSectionKey | null>(isEdit.value ? null : 'canastas')
const activePlayerIndex = ref(0)
const reviewing = ref(false)

const playerCounts = computed(() => {
  const counts = { A: 0, B: 0, C: 0 } as Record<TeamId, number>
  for (const team of teams.value) counts[team] = playersByTeam.value[team].length
  return counts
})

const steps = computed(() => buildSteps(teams.value, playerCounts.value))

// Filled on load (edited rounds start fully visited).
const visited = ref(new Set<string>())

/** Marks the step the scorer is leaving. Hand is tracked per player. */
function markVisited(team: TeamId, section: RoundSectionKey | null, player = 0) {
  if (!section) return
  const key = visitKey(team, section, player)
  if (!visited.value.has(key)) visited.value = new Set(visited.value).add(key)
}

function markCurrentVisited() {
  markVisited(activeTeam.value, openSection.value, activePlayerIndex.value)
}

function isVisitedFor(team: TeamId) {
  return (section: RoundSectionKey) => isSectionVisited(visited.value, team, section, playerCounts.value[team])
}

function teamDone(team: TeamId) {
  return firstTodoStep(steps.value, visited.value, team) === null
}

const currentStepIndex = computed(() =>
  flowStepIndex(steps.value, visited.value, {
    team: activeTeam.value,
    section: openSection.value,
    player: activePlayerIndex.value,
  }),
)

const nextStep = computed(() => steps.value[currentStepIndex.value + 1] ?? null)

const nextLabel = computed(() => {
  const next = nextStep.value
  if (!next) return t('roundEntry.review')
  if (next.team !== activeTeam.value) return t('roundEntry.next', { step: teamLabel(next.team) })
  if (next.section === 'hand' && openSection.value === 'hand') {
    return t('roundEntry.next', { step: playersByTeam.value[next.team][next.player]?.name ?? '' })
  }
  return t('roundEntry.next', { step: t(`roundEntry.sections.${next.section}`) })
})

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

async function scrollToSection(team: TeamId, section: RoundSectionKey) {
  await nextTick()
  const el = document.getElementById(`round-${team}-${section}`)
  el?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  // Move focus to the opened section's heading so keyboard and screen-reader
  // users land where the new step starts.
  el?.querySelector<HTMLElement>('h3 button')?.focus({ preventScroll: true })
}

function goTo(team: TeamId, section: RoundSectionKey | null, player = 0) {
  markCurrentVisited()
  reviewing.value = false
  activeTeam.value = team
  openSection.value = section
  activePlayerIndex.value = player
  if (section) scrollToSection(team, section)
  else window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

function toggleSection(section: RoundSectionKey) {
  if (openSection.value === section) {
    markCurrentVisited()
    openSection.value = null
  } else if (section === 'hand') {
    // Reopen hand at the first player not yet asked.
    const todo = firstTodoStep(steps.value, visited.value, activeTeam.value)
    goTo(activeTeam.value, 'hand', todo?.section === 'hand' ? todo.player : 0)
  } else {
    goTo(activeTeam.value, section)
  }
}

function selectPlayer(index: number) {
  if (index === activePlayerIndex.value) return
  markCurrentVisited()
  activePlayerIndex.value = index
}

function selectTeam(team: TeamId) {
  if (team === activeTeam.value && !reviewing.value) return
  const todo = firstTodoStep(steps.value, visited.value, team)
  goTo(team, todo?.section ?? null, todo?.player ?? 0)
}

function openReview() {
  markCurrentVisited()
  openSection.value = null
  reviewing.value = true
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

function goNext() {
  const next = nextStep.value
  if (!next) return openReview()
  goTo(next.team, next.section, next.player)
}

// ── LOAD ────────────────────────────────────────────────────────
watch(
  [game, () => game.value?.rounds[roundIndex.value]],
  ([currentGame, existingRound]) => {
    if (loaded.value || !currentGame) return
    if (isEdit.value && !existingRound) return
    entries.value = {
      A: existingRound ? cloneEntry(existingRound.entries.A) : makeEmptyEntry(currentGame.partnership.A),
      B: existingRound ? cloneEntry(existingRound.entries.B) : makeEmptyEntry(currentGame.partnership.B),
      C: existingRound ? cloneEntry(existingRound.entries.C) : makeEmptyEntry(currentGame.partnership.C),
    }
    editingRoundId = existingRound?.id
    activeTeam.value = teams.value[0]
    // Edited rounds start fully visited: every section shows its summary.
    if (isEdit.value) visited.value = new Set(allVisitKeys(teams.value, playerCounts.value))
    loaded.value = true
  },
  { immediate: true },
)

// ── SAVE ────────────────────────────────────────────────────────
function persist() {
  if (!loaded.value) return
  if (editingRoundId !== undefined) {
    const saved = sessionsStore.updateRound(sessionId.value, gameIndex.value, editingRoundId, entries.value)
    if (!saved) alert(t('roundEntry.roundGone'))
  } else {
    sessionsStore.addRound(sessionId.value, gameIndex.value, entries.value)
  }
  router.push(`/sessions/${sessionId.value}/games/${gameIndex.value}`)
}

const teamTabColors: Record<TeamId, { active: string; inactive: string }> = {
  A: { active: 'border-wine bg-wine text-white shadow-sm shadow-wine/20', inactive: 'border-rose/40 bg-linen text-walnut' },
  B: { active: 'border-sage bg-sage text-white shadow-sm shadow-sage/20', inactive: 'border-rose/40 bg-linen text-walnut' },
  C: { active: 'border-gold bg-gold text-white shadow-sm shadow-gold/20', inactive: 'border-rose/40 bg-linen text-walnut' },
}
</script>

<template>
  <div
    v-if="roundMissing"
    class="mx-auto max-w-xl"
  >
    <p class="mb-4 text-walnut">
      {{ t('roundEntry.roundNotFound') }}
    </p>
    <RouterLink
      :to="`/sessions/${sessionId}/games/${gameIndex}`"
      class="text-sm font-medium text-wine underline"
    >
      {{ t('roundEntry.backToGame') }}
    </RouterLink>
  </div>
  <div
    v-else-if="session && game && loaded"
    class="mx-auto flex max-w-xl flex-col"
  >
    <div class="mb-3 flex items-baseline justify-between gap-3">
      <h1 class="font-display text-xl text-walnut">
        {{ t(isEdit ? 'roundEntry.editTitle' : 'roundEntry.title') }}
      </h1>
      <span class="text-sm text-clay">{{ t('roundEntry.roundNumber', { n: roundNumber }) }}</span>
    </div>

    <!-- Team tabs with live round totals; pinned just below the shell header
         (which itself slides away on scroll down). -->
    <div
      class="sticky z-10 -mx-5 mb-3 bg-cream/95 px-5 py-2 backdrop-blur transition-[top] duration-200 motion-reduce:transition-none"
      :style="{ top: 'var(--shell-header-offset, 0px)' }"
    >
      <div class="flex gap-2">
        <button
          v-for="team in teams"
          :key="team"
          type="button"
          class="flex min-h-12 flex-1 flex-col items-center justify-center rounded-xl border px-2 py-1 transition-all active:scale-[0.97]"
          :class="activeTeam === team && !reviewing ? teamTabColors[team].active : teamTabColors[team].inactive"
          :aria-pressed="activeTeam === team && !reviewing"
          @click="selectTeam(team)"
        >
          <span class="flex items-center gap-1 text-xs font-medium opacity-90">
            {{ teamLabel(team) }}
            <svg
              v-if="teamDone(team)"
              viewBox="0 0 20 20"
              fill="currentColor"
              class="h-3.5 w-3.5"
              aria-hidden="true"
            ><path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.58l7.3-7.3a1 1 0 0 1 1.4 0Z" /></svg>
          </span>
          <span class="text-base font-semibold tabular-nums">{{ formatPoints(breakdowns[team].total) }}</span>
        </button>
      </div>
    </div>

    <template v-if="!reviewing">
      <!-- Round-level: asked once, not per team -->
      <div class="mb-3 rounded-2xl border border-rose/40 bg-linen p-3">
        <p
          id="went-out-label"
          class="mb-2 text-sm font-semibold text-walnut"
        >
          {{ t('roundEntry.whoWentOut') }}
        </p>
        <div
          class="flex gap-1.5"
          role="group"
          aria-labelledby="went-out-label"
        >
          <button
            v-for="option in [...teams, null]"
            :key="option ?? 'none'"
            type="button"
            class="min-h-10 flex-1 rounded-lg border px-2 text-sm font-medium transition-colors"
            :class="wentOutTeam === option ? 'border-walnut bg-walnut text-white' : 'border-rose/40 bg-ivory text-walnut'"
            :aria-pressed="wentOutTeam === option"
            @click="setWentOut(option)"
          >
            {{ option ? teamLabel(option) : t('roundEntry.nobody') }}
          </button>
        </div>
        <template v-if="wentOutTeam">
          <label class="mt-2 flex min-h-10 items-center gap-3 text-sm text-walnut">
            <input
              type="checkbox"
              class="h-5 w-5 rounded accent-wine"
              :checked="entries[wentOutTeam].blackThreesBonus"
              @change="setBlackThrees(($event.target as HTMLInputElement).checked)"
            >
            {{ t('roundEntry.blackThreesBonusLabel') }}
          </label>
          <p
            v-if="wentOutInvalid"
            class="text-xs text-wine"
          >
            {{ t('roundEntry.violations.invalidIda') }}
          </p>
        </template>
      </div>

      <TeamRoundAccordion
        :key="activeTeam"
        :model-value="entries[activeTeam]"
        :team="activeTeam"
        :players="playersByTeam[activeTeam]"
        :rules="rules"
        :breakdown="breakdowns[activeTeam]"
        :max-honors="maxHonors"
        :player-count="playerCount"
        :open-section="openSection"
        :active-player-index="activePlayerIndex"
        :is-visited="isVisitedFor(activeTeam)"
        @update:model-value="updateEntry(activeTeam, $event)"
        @toggle="toggleSection"
        @select-player="selectPlayer"
      />
    </template>

    <RoundReview
      v-else
      :teams="teams"
      :entries="entries"
      :breakdowns="breakdowns"
      :players="playersByTeam"
      :validation="validation"
      :card-supply-warnings="cardSupplyWarnings"
      @go-to="goTo"
    />

    <!-- Always-reachable actions; eats main's bottom padding so it sits flush. -->
    <div class="safe-bottom sticky bottom-0 z-10 -mx-5 mt-4 -mb-6 border-t border-rose/40 bg-ivory/95 px-5 pt-3 backdrop-blur">
      <div class="flex gap-2 pb-3">
        <template v-if="!reviewing">
          <BaseButton
            variant="secondary"
            @click="openReview"
          >
            {{ t('roundEntry.review') }}
          </BaseButton>
          <BaseButton
            class="min-w-0 flex-1 truncate"
            @click="goNext"
          >
            {{ nextLabel }} →
          </BaseButton>
        </template>
        <template v-else>
          <BaseButton
            variant="secondary"
            @click="goTo(activeTeam, null)"
          >
            {{ t('roundEntry.keepEditing') }}
          </BaseButton>
          <BaseButton
            class="flex-1"
            @click="persist"
          >
            {{ validation.valid ? t('roundEntry.save') : t('roundEntry.saveAnyway') }}
          </BaseButton>
        </template>
      </div>
    </div>
  </div>
</template>
