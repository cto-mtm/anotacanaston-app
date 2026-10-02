import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { registerNative } from './lib/native'
import { registerAuth } from './lib/auth'
import { createPersistencePlugin } from './lib/persistence'
import { useSettingsStore } from './stores/settings'
import './assets/css/main.css'

const app = createApp(App)
const pinia = createPinia()
pinia.use(createPersistencePlugin())

app.use(pinia)
app.use(router)
app.use(i18n)

// The persistence plugin hydrates synchronously on first use, so the
// locale preference is already loaded here — sync it into vue-i18n before
// mounting, otherwise every reload silently falls back to the default.
const settings = useSettingsStore()
i18n.global.locale.value = settings.locale

registerNative(router)
// Bridge Firebase auth state into the account store + kick off cloud sync for
// entitled users. Safe no-op when no one is signed in.
registerAuth()

app.mount('#app')
