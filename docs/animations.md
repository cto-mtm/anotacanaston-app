# Animation Cookbook

Two primitives only: the native **View Transitions API** for between-page
animation (including Flutter-style hero/shared-element morphs), and Vue's
built-in `<Transition>` / `<TransitionGroup>` for within-page enter/leave.
Nothing else — no motion libraries, no GSAP, no scroll-jacking.

## 1. Add a hero transition between two pages

Three-step name-matching recipe, demonstrated by `SessionCard.vue` →
`SessionDetailPage.vue`:

1. On the source element (in the card), add an inline dynamic style:
   `:style="{ viewTransitionName: 'session-' + session.id }"`.
2. On the target element (the equivalent block on the detail page), add the
   **same** name: `:style="{ viewTransitionName: 'session-' + session.id }"`.
3. That's the whole mechanism — the browser matches the two names across the
   navigation and morphs position/size automatically.

**Critical rule:** a `view-transition-name` must be unique per page at any
moment. Never put a static name in a `v-for` — always derive it from the
item's id. Title text can morph the same way with a second name
(`'session-title-' + session.id`).

## 2. Add a custom per-page transition

Worked example — a slide-in for `/about`:

1. Give the page's root element `:style="{ viewTransitionName: 'about-page' }"`.
2. Add one `@keyframes` + `::view-transition-old(about-page)` /
   `::view-transition-new(about-page)` rule in `transitions.css`.
3. Keep the duration inside 200–350ms and animate only `transform`/`opacity`.

## 3. Animate a list reorder / insert / remove

Wrap the list in `<TransitionGroup name="list">` and rely on the `.list-*`
classes under "Recipe 4" in `transitions.css` — `.list-move` handles the FLIP
reorder animation, `.list-enter-*` / `.list-leave-*` handle insert/remove.

## 4. Animate a toggleable panel (e.g. the mobile menu)

`AppShell.vue`'s full-screen mobile menu is the reference: a `ref<boolean>`
gates a `v-if` block wrapped in `<Transition name="mobile-menu">`, and the
`.mobile-menu-*` classes under "Recipe 5" in `transitions.css` slide it in
from the right while fading. The same pattern works for any show/hide
panel — pick a unique transition `name`, define `<name>-enter-from` /
`<name>-leave-to` (the hidden state) and `<name>-enter-active` /
`<name>-leave-active` (the `transition` property), and let the browser
interpolate to the element's normal resting styles.

## 5. The rules

- Animate only `transform` and `opacity` (compositor-friendly).
- Durations 200–350ms. Easing: `cubic-bezier(0.4, 0, 0.2, 1)`.
- `view-transition-name` values must be unique per page.
- Always test with reduced motion — every recipe must degrade to an instant
  cross-fade or instant navigation, never a broken/stuck state.
- Never nest `startViewTransition` calls.

## 6. Platform support

Chromium (including Android WebView) since version 111; iOS WKWebView since
iOS 18. On anything older, the router wrapper silently degrades to instant
navigation — that's the designed fallback, not a bug.
