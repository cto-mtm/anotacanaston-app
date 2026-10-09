<script setup lang="ts">
// The logo's basket lattice, huge and faint, bleeding off the bottom-right
// corner. Brand moments only (welcome, empty states) — never behind scores or
// forms (docs/design.md). Fixed and behind the content, so it can't cause
// horizontal scroll or catch taps.
import watermark from '../assets/images/weave-watermark.svg'
</script>

<template>
  <div
    class="pointer-events-none fixed -right-36 -bottom-32 -z-10 h-96 w-96 bg-contain bg-center bg-no-repeat"
    :style="{ backgroundImage: `url(${watermark})` }"
    aria-hidden="true"
  />
</template>
