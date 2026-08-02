# Visual Design — Anota Canaston

## Target Audience

40+ year old women from Latin America, middle-upper class. They play Canastón
as a social ritual — it's card night with friends, wine, and conversation.
The app should feel warm, elegant, and approachable — never techy, never
cold, never "startup-ish."

## Design Principles

1. **Warm & inviting** — Cream and earthy tones, not cold grays. Evokes an
   elegant living room, not a spreadsheet.
2. **Legible above all** — Large touch targets (min 44px), generous text
   sizes, high contrast. This is used in low-light social settings.
3. **Casually refined** — Decorative touches (the cursive brand font) paired
   with a clean sans-serif body. Think a handwritten menu at a nice
   restaurant, not a corporate dashboard.
4. **Minimal cognitive load** — Clear hierarchy, obvious actions, no ambiguity.
   The scoring rules are complex enough; the UI should not add confusion.
5. **Personality without clutter** — A playing-card or felt-table motif in
   subtle touches (colors, dividers, card-shape shadows), never literal
   illustrations that look clipart-y.

## Color Palette

| Token            | Value     | Usage                              |
| ---------------- | --------- | ---------------------------------- |
| `--color-cream`  | `#FDF8F0` | Page background                    |
| `--color-linen`  | `#F5EDE3` | Card/surface background            |
| `--color-walnut` | `#4A3728` | Primary text, headings             |
| `--color-clay`   | `#7C5E4A` | Secondary text                     |
| `--color-sage`   | `#5B7A5E` | Positive/success, "in progress"    |
| `--color-wine`   | `#8B3A4A` | Accent, primary buttons, CTAs      |
| `--color-gold`   | `#B8860B` | Winner highlights, badges          |
| `--color-rose`   | `#E8C4C4` | Soft highlight, hover states       |
| `--color-ivory`  | `#FFFEF9` | Header/overlay background          |

## Typography

- **Brand/Headings:** Fondamento (already installed) — used for `<h1>` page
  titles, the logo wordmark, and winner announcements. NOT for body text.
- **Body/UI:** DM Sans — clean geometric sans-serif, friendly but not
  childish. Excellent readability at all sizes. Used for everything else:
  labels, buttons, table data, form fields, navigation.
- **Numeric data:** DM Sans with `font-variant-numeric: tabular-nums` for
  aligned score columns.

## Component Tokens

- **Border radius:** Cards `1rem`, buttons `0.75rem`, pills `9999px`, inputs `0.5rem`
- **Shadows:** Cards use `0 2px 8px rgba(74, 55, 40, 0.08)` — warm-tinted, not gray
- **Spacing:** Base rhythm 4px, prefer `p-4`/`p-5` over `p-3` for breathing room
- **Touch targets:** Minimum 44×44px for all interactive elements (already enforced via `min-h-11`)
- **Transitions:** 200ms ease for color/opacity, 250ms for transforms (already in transitions.css)

## Team Colors

- **Team A:** Wine (`--color-wine`) — bold, warm
- **Team B:** Sage (`--color-sage`) — natural, grounded

These replace the generic indigo/rose currently used for team assignment.

## Anti-patterns (avoid)

- ❌ Cold neutral grays (`neutral-50`, `neutral-900` as primaries)
- ❌ Indigo/purple tech accents
- ❌ Flat white cards with 1px gray borders (SaaS look)
- ❌ Pure black text
- ❌ Cursive font for body text or small sizes
- ❌ Gradient backgrounds
- ❌ Icon-heavy UI (this audience prefers clear text labels)
