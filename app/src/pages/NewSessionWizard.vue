<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useSessionsStore } from '../stores/sessions'
import { buildFourPlayerSchedule } from '../domain/rotation'
import PlayerPicker from '../components/PlayerPicker.vue'
import PartnershipPicker from '../components/PartnershipPicker.vue'
import BaseButton from '../components/BaseButton.vue'
import type { Player, PlayerId, SixPlayerFormat, TeamId } from '../domain/types'

const { t } = useI18n()
const router = useRouter()
const sessionsStore = useSessionsStore()

const step = ref(1)
const playerCount = ref<4 | 6>(4)
const sixPlayerFormat = ref<SixPlayerFormat>('2x3')
const date = ref(new Date().toISOString().slice(0, 10))
const players = ref<Player[]>(
  Array.from({ length: 4 }, () => ({ id: crypto.randomUUID(), name: '' })),
)

watch(playerCount, (count) => {
  players.value = Array.from({ length: count }, (_, i) => players.value[i] ?? { id: crypto.randomUUID(), name: '' })
})

const namesValid = computed(
  () =>
    players.value.every((p) => p.name.trim().length > 0) &&
    new Set(players.value.map((p) => p.name.trim())).size === players.value.length,
)

const manoId = ref<PlayerId | null>(null)
const dealerId = ref<PlayerId | null>(null)

watch(manoId, (id) => {
  if (!id) return
  const idx = players.value.findIndex((p) => p.id === id)
  const nextIdx = (idx + 1) % players.value.length
  dealerId.value = players.value[nextIdx].id
})

// ── 4-player partnership ────────────────────────────────────────
const partnerId = ref<PlayerId | null>(null)

const fourPlayerPreview = computed(() => {
  if (playerCount.value !== 4 || !manoId.value || !dealerId.value || !partnerId.value) return null
  const others = players.value.map((p) => p.id).filter((id) => id !== manoId.value && id !== partnerId.value)
  try {
    return buildFourPlayerSchedule(
      players.value.map((p) => p.id),
      manoId.value,
      dealerId.value,
      { A: [manoId.value, partnerId.value], B: others, C: [] },
    )
  } catch {
    return null
  }
})

function playerName(id: PlayerId): string {
  return players.value.find((p) => p.id === id)?.name ?? id
}

// ── 6-player games ───────────────────────────────────────────────
interface SixPlayerGameDraft {
  partnership: Record<TeamId, PlayerId[]>
  dealerId: PlayerId | null
}

function makeEmptyPartnership(): Record<TeamId, PlayerId[]> {
  return { A: [], B: [], C: [] }
}

const sixPlayerGames = ref<SixPlayerGameDraft[]>([{ partnership: makeEmptyPartnership(), dealerId: null }])

// Reset games when format changes
watch(sixPlayerFormat, () => {
  sixPlayerGames.value = [{ partnership: makeEmptyPartnership(), dealerId: null }]
})

function addGame() {
  sixPlayerGames.value.push({ partnership: makeEmptyPartnership(), dealerId: null })
}
function removeGame(index: number) {
  if (sixPlayerGames.value.length > 1) sixPlayerGames.value.splice(index, 1)
}

const sixPlayerTeamSize = computed(() => (sixPlayerFormat.value === '2x3' ? 3 : 2))
const sixPlayerTeams = computed((): TeamId[] => (sixPlayerFormat.value === '2x3' ? ['A', 'B'] : ['A', 'B', 'C']))

const sixPlayerGamesValid = computed(() =>
  sixPlayerGames.value.every((g) => {
    const allAssigned = sixPlayerTeams.value.every(
      (team) => g.partnership[team].length === sixPlayerTeamSize.value,
    )
    return allAssigned && g.dealerId
  }),
)

// ── navigation ───────────────────────────────────────────────────
const canGoNext = computed(() => {
  if (step.value === 1) return true
  if (step.value === 2) return namesValid.value
  if (step.value === 3) return Boolean(manoId.value && dealerId.value)
  return true
})

const canCreate = computed(() => {
  if (playerCount.value === 4) return Boolean(fourPlayerPreview.value)
  return sixPlayerGamesValid.value
})

function next() {
  if (canGoNext.value && step.value < 4) step.value += 1
}
function back() {
  if (step.value > 1) step.value -= 1
}

function create() {
  if (!manoId.value) return

  if (playerCount.value === 4) {
    if (!dealerId.value || !partnerId.value) return
    const others = players.value.map((p) => p.id).filter((id) => id !== manoId.value && id !== partnerId.value)
    const session = sessionsStore.createSession({
      date: date.value,
      playerCount: 4,
      players: players.value,
      manoId: manoId.value,
      initialDealerId: dealerId.value,
      initialPartnership: { A: [manoId.value, partnerId.value], B: others, C: [] },
    })
    router.push(`/sessions/${session.id}`)
    return
  }

  if (!sixPlayerGamesValid.value) return
  const session = sessionsStore.createSession({
    date: date.value,
    playerCount: 6,
    sixPlayerFormat: sixPlayerFormat.value,
    players: players.value,
    manoId: manoId.value,
    games: sixPlayerGames.value.map((g) => ({
      partnership: g.partnership,
      dealerId: g.dealerId as PlayerId,
      manoId: manoId.value as PlayerId,
    })),
  })
  router.push(`/sessions/${session.id}`)
}
</script>

<template>
  <div class="mx-auto max-w-xl">
    <h1 class="mb-5 font-display text-2xl text-walnut">
      {{ t('newSession.title') }}
    </h1>

    <!-- Step indicator -->
    <div class="mb-6 flex items-center gap-2">
      <div
        v-for="s in 4"
        :key="s"
        class="h-1.5 flex-1 rounded-full transition-colors"
        :class="s <= step ? 'bg-wine' : 'bg-rose/40'"
      />
    </div>

    <!-- Step 1 -->
    <section v-if="step === 1">
      <h2 class="mb-3 font-semibold text-walnut">
        {{ t('newSession.stepPlayerCount') }}
      </h2>
      <label class="mb-4 block text-sm text-walnut">
        {{ t('newSession.playerCountLabel') }}
        <div class="mt-2 flex gap-2">
          <button
            type="button"
            class="min-h-11 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.97]"
            :class="playerCount === 4 ? 'border-wine bg-wine text-white shadow-sm shadow-wine/20' : 'border-rose/40 bg-linen text-walnut'"
            @click="playerCount = 4"
          >
            {{ t('game.playerCount.4') }}
          </button>
          <button
            type="button"
            class="min-h-11 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.97]"
            :class="playerCount === 6 ? 'border-wine bg-wine text-white shadow-sm shadow-wine/20' : 'border-rose/40 bg-linen text-walnut'"
            @click="playerCount = 6"
          >
            {{ t('game.playerCount.6') }}
          </button>
        </div>
      </label>

      <!-- 6-player format choice -->
      <label
        v-if="playerCount === 6"
        class="mb-4 block text-sm text-walnut"
      >
        {{ t('newSession.sixPlayerFormatLabel') }}
        <div class="mt-2 flex gap-2">
          <button
            type="button"
            class="min-h-11 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.97]"
            :class="sixPlayerFormat === '2x3' ? 'border-wine bg-wine text-white shadow-sm shadow-wine/20' : 'border-rose/40 bg-linen text-walnut'"
            @click="sixPlayerFormat = '2x3'"
          >
            {{ t('game.sixPlayerFormat.2x3') }}
          </button>
          <button
            type="button"
            class="min-h-11 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.97]"
            :class="sixPlayerFormat === '3x2' ? 'border-wine bg-wine text-white shadow-sm shadow-wine/20' : 'border-rose/40 bg-linen text-walnut'"
            @click="sixPlayerFormat = '3x2'"
          >
            {{ t('game.sixPlayerFormat.3x2') }}
          </button>
        </div>
      </label>

      <label class="block text-sm text-walnut">
        {{ t('newSession.dateLabel') }}
        <input
          v-model="date"
          type="date"
          class="mt-1 block w-full rounded-xl border border-rose/40 bg-ivory px-4 py-2.5 text-base text-walnut focus:border-wine focus:outline-none focus:ring-1 focus:ring-wine/30"
        >
      </label>
    </section>

    <!-- Step 2 -->
    <section v-else-if="step === 2">
      <h2 class="mb-1 font-semibold text-walnut">
        {{ t('newSession.stepNames') }}
      </h2>
      <p class="mb-4 text-sm text-clay">
        {{ t('newSession.seatOrderHint') }}
      </p>
      <div
        v-for="(player, i) in players"
        :key="player.id"
        class="mb-3"
      >
        <label class="block text-sm text-walnut">
          {{ t('newSession.playerNameLabel', { n: i + 1 }) }}
          <input
            v-model="player.name"
            type="text"
            class="mt-1 block w-full rounded-xl border border-rose/40 bg-ivory px-4 py-2.5 text-base text-walnut focus:border-wine focus:outline-none focus:ring-1 focus:ring-wine/30"
          >
        </label>
      </div>
      <p
        v-if="!namesValid"
        class="text-sm font-medium text-wine"
      >
        {{ t('newSession.validation.needUniqueNames') }}
      </p>
    </section>

    <!-- Step 3 -->
    <section v-else-if="step === 3">
      <h2 class="mb-1 font-semibold text-walnut">
        {{ t('newSession.stepMano') }}
      </h2>
      <p class="mb-4 text-sm text-clay">
        {{ t('newSession.manoHint') }}
      </p>
      <PlayerPicker
        :players="players"
        :model-value="manoId"
        @update:model-value="manoId = $event"
      />

      <template v-if="manoId">
        <h3 class="mb-1 mt-5 text-sm font-semibold text-walnut">
          {{ t('newSession.dealerLabel') }}
        </h3>
        <p class="mb-2 text-xs text-clay">
          {{ t('newSession.dealerAutoHint') }}
        </p>
        <PlayerPicker
          :players="players"
          :model-value="dealerId"
          :exclude-ids="[manoId]"
          @update:model-value="dealerId = $event"
        />
      </template>
    </section>

    <!-- Step 4 -->
    <section v-else-if="step === 4">
      <h2 class="mb-1 font-semibold text-walnut">
        {{ t('newSession.stepPartnership') }}
      </h2>

      <template v-if="playerCount === 4">
        <p class="mb-3 text-sm text-clay">
          {{ t('newSession.choosePartner') }}
        </p>
        <PlayerPicker
          :players="players"
          :model-value="partnerId"
          :exclude-ids="manoId ? [manoId] : []"
          @update:model-value="partnerId = $event"
        />

        <div
          v-if="fourPlayerPreview"
          class="mt-5"
        >
          <h3 class="mb-2 text-sm font-semibold text-walnut">
            {{ t('newSession.schedulePreview') }}
          </h3>
          <ol class="space-y-2">
            <li
              v-for="(game, i) in fourPlayerPreview"
              :key="i"
              class="rounded-xl border border-rose/40 bg-linen p-3 text-sm"
            >
              <p class="font-semibold text-walnut">
                {{ t('newSession.gameLabel', { n: i + 1 }) }}
              </p>
              <p class="text-walnut">{{ t('game.team.A') }}: {{ game.partnership.A.map(playerName).join(' / ') }}</p>
              <p class="text-walnut">{{ t('game.team.B') }}: {{ game.partnership.B.map(playerName).join(' / ') }}</p>
              <p class="text-clay">
                {{ t('newSession.dealerLabel') }}: {{ playerName(game.dealerId) }}
              </p>
            </li>
          </ol>
        </div>
      </template>

      <template v-else>
        <p class="mb-3 text-sm text-clay">
          {{ t('newSession.assignTeams') }}
        </p>
        <div
          v-for="(game, i) in sixPlayerGames"
          :key="i"
          class="mb-4 rounded-2xl border border-rose/40 bg-linen p-4"
        >
          <div class="mb-2 flex items-center justify-between">
            <p class="text-sm font-semibold text-walnut">
              {{ t('newSession.gameLabel', { n: i + 1 }) }}
            </p>
            <button
              v-if="sixPlayerGames.length > 1"
              type="button"
              class="text-xs font-medium text-wine underline"
              @click="removeGame(i)"
            >
              {{ t('newSession.removeGame') }}
            </button>
          </div>
          <PartnershipPicker
            :players="players"
            v-model="game.partnership"
            :team-size="sixPlayerTeamSize"
            :teams="sixPlayerTeams"
          />
          <div class="mt-3">
            <p class="mb-1 text-xs text-clay">
              {{ t('newSession.dealerLabel') }}
            </p>
            <PlayerPicker
              :players="players"
              :model-value="game.dealerId"
              @update:model-value="game.dealerId = $event"
            />
          </div>
        </div>
        <BaseButton
          variant="secondary"
          @click="addGame"
        >
          {{ t('newSession.addGame') }}
        </BaseButton>
      </template>
    </section>

    <div class="mt-6 flex justify-between">
      <BaseButton
        v-if="step > 1"
        variant="secondary"
        @click="back"
      >
        {{ t('common.back') }}
      </BaseButton>
      <span v-else />
      <BaseButton
        v-if="step < 4"
        :disabled="!canGoNext"
        @click="next"
      >
        {{ t('common.next') }}
      </BaseButton>
      <BaseButton
        v-else
        :disabled="!canCreate"
        @click="create"
      >
        {{ t('newSession.createSession') }}
      </BaseButton>
    </div>
  </div>
</template>
