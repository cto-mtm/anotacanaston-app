<script setup lang="ts">
// The signed-in user's face: their Google photo, else their initial — or an
// outline person when nobody is signed in.
import { computed, ref, watch } from 'vue'
import { useAccountStore } from '../stores/account'
import UserIcon from './icons/UserIcon.vue'

const props = withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg' }>(), { size: 'sm' })

const SIZE_CLASS = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-14 w-14 text-xl',
} as const

const account = useAccountStore()

const photo = computed(() => (account.isSignedIn ? account.user?.photoURL ?? null : null))
const initial = computed(() => {
  const name = account.user?.displayName || account.user?.email || ''
  return name.trim().charAt(0).toUpperCase()
})

// Google photo URLs can fail (expired, blocked) — fall back to the initial.
const photoFailed = ref(false)
watch(photo, () => {
  photoFailed.value = false
})
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
    :class="[SIZE_CLASS[props.size], account.isSignedIn ? 'bg-wine text-white' : 'border border-rose/40 bg-linen text-clay']"
    aria-hidden="true"
  >
    <img
      v-if="photo && !photoFailed"
      :src="photo"
      alt=""
      referrerpolicy="no-referrer"
      class="h-full w-full object-cover"
      @error="photoFailed = true"
    >
    <span
      v-else-if="account.isSignedIn && initial"
      class="font-semibold leading-none"
    >{{ initial }}</span>
    <UserIcon
      v-else
      class="h-3/5 w-3/5"
    />
  </span>
</template>
