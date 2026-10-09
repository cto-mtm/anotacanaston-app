// Renders a session-result "share card" to a PNG entirely on a <canvas>.
//
// Why canvas instead of a DOM-to-image library: this has to work inside the
// native Capacitor WebView too, where html-to-image / dom-to-svg approaches
// are flaky (foreignObject + web fonts). A hand-drawn canvas is dependency-free,
// deterministic, and produces a fixed-size image ideal for a WhatsApp share.
//
// The card is intentionally pure (no Vue, no i18n imports) — callers pass in
// already-translated labels so this stays a plain rendering function, mirroring
// the domain/ "pure TS, zero framework" convention.

/** Palette pulled from src/assets/css/main.css @theme tokens. */
const COLOR = {
  cream: '#FDF8F0',
  linen: '#F5EDE3',
  walnut: '#4A3728',
  clay: '#7C5E4A',
  wine: '#9B2A2A',
  gold: '#8A6608',
  goldLight: '#FDF6E3',
  rose: '#E8C4C4',
} as const

const WIDTH = 1080
const HEIGHT = 1350 // 4:5 — the portrait ratio WhatsApp/Instagram stories favour

export interface ShareCardPlayer {
  name: string
  /** Pre-formatted by the caller (e.g. "+2" for rounded tallies). */
  score: string
}

export interface ShareCardData {
  /** e.g. "3 sept 2025" — already formatted by the caller. */
  dateLabel: string
  /** Localized winner/winners heading. */
  winnerLabel: string
  /** Winner name(s), already joined (e.g. "Ana / Sofía"). */
  winnerNames: string
  /** Localized "Individual tally" section heading. */
  talliesLabel: string
  /** Players sorted best-first. */
  players: ShareCardPlayer[]
  /** App name / wordmark footer, e.g. "Anota Canaston". */
  brandLabel: string
  /** Localized call-to-action footer, e.g. "Anotá con la app". */
  ctaLabel: string
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * Draws the card and returns it as a PNG data URL. The two font families match
 * the app (Fondamento display + DM Sans body); if they haven't loaded yet the
 * canvas falls back to serif/sans, so callers should `await document.fonts.ready`
 * first when they can.
 */
export function renderShareCard(data: ShareCardData): string {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')

  // Background
  ctx.fillStyle = COLOR.cream
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  const pad = 80
  const contentW = WIDTH - pad * 2

  // Date (top, small, muted)
  ctx.textAlign = 'center'
  ctx.fillStyle = COLOR.clay
  ctx.font = '36px "DM Sans Variable", sans-serif'
  ctx.fillText(data.dateLabel, WIDTH / 2, 150)

  // Winner banner
  const bannerY = 210
  const bannerH = 300
  ctx.fillStyle = COLOR.goldLight
  roundedRect(ctx, pad, bannerY, contentW, bannerH, 40)
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = COLOR.gold
  ctx.stroke()

  ctx.fillStyle = COLOR.gold
  ctx.font = '600 40px "DM Sans Variable", sans-serif'
  ctx.fillText(data.winnerLabel.toUpperCase(), WIDTH / 2, bannerY + 100)

  ctx.fillStyle = COLOR.walnut
  ctx.font = '96px "Fondamento", serif'
  fitText(ctx, data.winnerNames, contentW - 80, 96, 'Fondamento", serif')
  ctx.fillText(data.winnerNames, WIDTH / 2, bannerY + 215)

  // Tallies heading
  let y = bannerY + bannerH + 110
  ctx.textAlign = 'left'
  ctx.fillStyle = COLOR.walnut
  ctx.font = '52px "Fondamento", serif'
  ctx.fillText(data.talliesLabel, pad, y)
  y += 40

  // Tally rows
  const rowH = 92
  const rowGap = 20
  ctx.font = '44px "DM Sans Variable", sans-serif'
  data.players.forEach((player, i) => {
    const rowY = y + i * (rowH + rowGap)
    const isLeader = i === 0
    ctx.fillStyle = isLeader ? COLOR.goldLight : COLOR.linen
    roundedRect(ctx, pad, rowY, contentW, rowH, 24)
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = isLeader ? COLOR.gold : COLOR.rose
    ctx.stroke()

    ctx.fillStyle = COLOR.walnut
    ctx.textAlign = 'left'
    ctx.font = isLeader
      ? '600 46px "DM Sans Variable", sans-serif'
      : '44px "DM Sans Variable", sans-serif'
    ctx.fillText(player.name, pad + 40, rowY + rowH / 2 + 16)

    ctx.textAlign = 'right'
    ctx.font = '600 46px "DM Sans Variable", sans-serif'
    ctx.fillText(player.score,WIDTH - pad - 40, rowY + rowH / 2 + 16)
  })

  // Footer: brand + CTA
  ctx.textAlign = 'center'
  ctx.fillStyle = COLOR.wine
  ctx.font = '64px "Fondamento", serif'
  ctx.fillText(data.brandLabel, WIDTH / 2, HEIGHT - 130)

  ctx.fillStyle = COLOR.clay
  ctx.font = '38px "DM Sans Variable", sans-serif'
  ctx.fillText(data.ctaLabel, WIDTH / 2, HEIGHT - 70)

  return canvas.toDataURL('image/png')
}

/**
 * Shrinks the current font down until `text` fits within `maxWidth`, so long
 * winner names (e.g. "Ana / Sofía / María") never overflow the card.
 */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  fontTail: string,
): void {
  let size = startSize
  ctx.font = `${size}px "${fontTail}`
  while (ctx.measureText(text).width > maxWidth && size > 40) {
    size -= 4
    ctx.font = `${size}px "${fontTail}`
  }
}
