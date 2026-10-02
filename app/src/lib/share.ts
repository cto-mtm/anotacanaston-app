import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { Directory, Filesystem } from '@capacitor/filesystem'

// Hands a rendered image to the platform's native share sheet — the single
// entry point for the "share this to WhatsApp" flow.
//
// Three tiers, best-available first:
//   1. Native (iOS/Android via Capacitor): write the PNG to the cache dir,
//      then Share.share() a file:// URI → real WhatsApp/Instagram/etc. sheet.
//   2. Web with Web Share API + file support: navigator.share({ files }).
//   3. Web fallback: trigger a download so the user can attach it manually.

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled' | 'unsupported'

export interface ShareImageOptions {
  /** PNG data URL (e.g. from renderShareCard). */
  dataUrl: string
  /** File name used on disk / in the download, without extension. */
  fileName: string
  /** Optional text shared alongside the image (title/dialog title on native). */
  title?: string
  text?: string
}

function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(',')
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1)
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

export async function shareImage(options: ShareImageOptions): Promise<ShareOutcome> {
  const { dataUrl, fileName, title, text } = options
  const pngName = `${fileName}.png`

  // ── Tier 1: native ─────────────────────────────────────────────
  if (Capacitor.isNativePlatform()) {
    try {
      const written = await Filesystem.writeFile({
        path: pngName,
        data: dataUrlToBase64(dataUrl),
        directory: Directory.Cache,
      })
      await Share.share({ title, text, files: [written.uri], dialogTitle: title })
      return 'shared'
    } catch (err) {
      // Capacitor throws on user-cancel too; treat any abort as a cancel
      // rather than surfacing a scary error for a benign dismissal.
      if (isAbort(err)) return 'cancelled'
      throw err
    }
  }

  // ── Tier 2: Web Share API with files ───────────────────────────
  const blob = await dataUrlToBlob(dataUrl)
  const file = new File([blob], pngName, { type: 'image/png' })
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean
  }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title, text })
      return 'shared'
    } catch (err) {
      if (isAbort(err)) return 'cancelled'
      // Fall through to download on any non-cancel failure.
    }
  }

  // ── Tier 3: download fallback ──────────────────────────────────
  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = pngName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return 'downloaded'
  } catch {
    return 'unsupported'
  }
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && (err.name === 'AbortError' || /cancel/i.test(err.message))
}
