import { createRouter, createWebHistory, START_LOCATION } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('../pages/HomePage.vue') },
    { path: '/sessions/new', name: 'session-new', component: () => import('../pages/NewSessionWizard.vue') },
    { path: '/sessions/:id', name: 'session-detail', component: () => import('../pages/SessionDetailPage.vue') },
    { path: '/sessions/:id/summary', name: 'session-summary', component: () => import('../pages/SessionSummaryPage.vue') },
    { path: '/sessions/:id/games/:g', name: 'game', component: () => import('../pages/GamePage.vue') },
    {
      path: '/sessions/:id/games/:g/rounds/new',
      name: 'round-new',
      component: () => import('../pages/RoundEntryPage.vue'),
    },
    {
      path: '/sessions/:id/games/:g/rounds/:r',
      name: 'round-edit',
      component: () => import('../pages/RoundEntryPage.vue'),
    },
    { path: '/rules', name: 'rules', component: () => import('../pages/RulesPage.vue') },
    { path: '/about', name: 'about', component: () => import('../pages/AboutPage.vue') },
    // Catch-all 404. Required because Firebase Hosting rewrites every URL
    // to index.html — without this, typos render an empty RouterView.
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../pages/NotFoundPage.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

// ── VIEW TRANSITION WRAPPER ─────────────────────────────────────
// Every navigation becomes a view transition when the browser
// supports it. Pages opt into specific effects purely via CSS in
// assets/css/transitions.css — this file never changes per-page.
router.beforeResolve(async (_to, from) => {
  if (from === START_LOCATION) return // initial load: no transition
  if (!document.startViewTransition) return // unsupported: navigate plainly
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

  return new Promise<void>((resolve) => {
    document.startViewTransition(() => {
      resolve()
      return router.isReady() // let Vue swap the page inside the snapshot
    })
  })
})

export default router
