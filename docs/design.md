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

## The Logo Is the Source

The logo is a pun: *canasta* means basket — a woven basket holding a fan of
cards, the ace of clubs in front. Drawn monoline in one brick red, with the
club as the only filled shape. Everything else borrows from it:

- **Colour:** `--color-wine` is the logo's red (`#9B2A2A`), not a separate
  "wine" — so buttons, icons and the logo read as one brand. (The token keeps
  its old name to avoid churn.)
- **Motifs:** basket weave, playing cards, suits (mainly the club), and the
  wine of card night. Not generic app imagery (clouds, charts, medals, flames).
- **Weave band** (`.weave-band` in `main.css`): the basket's lattice as a thin
  texture — the header underline and the welcome divider. Use it sparingly, as
  punctuation; never as a background fill.
- **Paper grain:** the page background is cream plus a faint warm grain
  (`paper-grain.png`, 1.6 KB, set on `body` in `main.css`) so it reads as card
  stock, not a flat screen. Cards and surfaces stay solid on top of it.
- **Weave watermark** (`<WeaveWatermark />`): the logo's lattice, huge and
  faint, in the bottom-right corner — brand moments only (welcome, empty
  Home, empty dashboard). Never on screens with scores, forms or lists.
- **Logo files:** `logo-color.svg` is the 512px master (a raster inside an
  SVG — ask the designer for a true vector). The UI uses
  `logo-color-256.webp`; `public/` has the favicons and `apple-touch-icon.png`,
  all generated from the master.

## Color Palette

| Token            | Value     | Usage                              |
| ---------------- | --------- | ---------------------------------- |
| `--color-cream`  | `#FDF8F0` | Page background                    |
| `--color-linen`  | `#F5EDE3` | Card/surface background            |
| `--color-walnut` | `#4A3728` | Primary text, headings             |
| `--color-clay`   | `#7C5E4A` | Secondary text                     |
| `--color-sage`   | `#5B7A5E` | Positive/success, "in progress"    |
| `--color-wine`   | `#9B2A2A` | The logo's red: accent, primary buttons, CTAs |
| `--color-gold`   | `#8A6608` | Winner highlights, badges          |
| `--color-rose`   | `#E8C4C4` | Soft highlight, hover states       |
| `--color-ivory`  | `#FFFEF9` | Header/overlay background          |

Any colour used for text (or with white text on it) must reach WCAG AA 4.5:1
against cream, linen, ivory and its own `-light` tint. Gold was darkened from
`#B8860B` (≈3:1) for this. `src/lib/shareCard.ts` mirrors these values for
the share image — change both together.

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

## Icons

- Components in `src/components/icons/`, never emoji (emoji render differently
  on every platform and read as clipart).
- Drawn like the logo: 24×24 grid, `fill="none"`, `stroke="currentColor"`,
  round caps and joins — plus **one small filled suit** as the accent, the way
  the logo's ace carries a solid club. Spot icons (menu, Club benefits,
  dashboard) use `stroke-width="1.5"`; small action icons (trash, pencil,
  chevron) use `2` and stay conventional so they're instantly recognised.
- Subjects come from the card table: `BasketIcon` (backup), `DevicesIcon`
  (same game everywhere), `ScorePadIcon` (stats — *anota*), `CheersIcon`
  (game nights), `CardStackIcon` (games, streaks), `ClubIcon`. Utility icons
  (settings, info, account) stay generic.
- Leaderboard ranks are `RankCard` — a tiny playing card, gold for first —
  not medals.
- Colour comes from the caller via `text-*`. Spot icons sit in a rounded tile
  tinted with a palette pair: `bg-wine-light text-wine`, `bg-sage-light text-sage`,
  `bg-gold-light text-gold`, `bg-rose/30 text-walnut`.
- Icons accompany text labels; they never replace them.

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
