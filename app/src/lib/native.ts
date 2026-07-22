import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import type { Router } from 'vue-router'

// Without this, the Android hardware/gesture back button closes the app
// from any page instead of navigating back within the SPA.
export function registerNative(router: Router) {
  if (!Capacitor.isNativePlatform()) return

  App.addListener('backButton', () => {
    if (window.history.state?.back) {
      router.back()
    } else {
      App.exitApp()
    }
  })
}
