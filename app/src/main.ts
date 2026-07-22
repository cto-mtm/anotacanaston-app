import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { registerNative } from './lib/native'
import { createPersistencePlugin } from './lib/persistence'
import './assets/css/main.css'

const app = createApp(App)
const pinia = createPinia()
pinia.use(createPersistencePlugin())

app.use(pinia)
app.use(router)
app.use(i18n)

registerNative(router)

app.mount('#app')
