// Single Firebase client entry point. Everything auth/Firestore-related in the
// app imports `auth` / `db` from here — nothing else calls initializeApp.
//
// Local-first dev is preserved: in DEV we point Auth + Firestore at the local
// emulators (same suite that already serves the Functions API), so
// `npm run dev` still needs no real Firebase project or internet. In prod the
// VITE_FIREBASE_* values come from the console (Project settings → SDK setup).

import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

// In DEV, project id must match the emulator's (`demo-app`, see firebase.json
// singleProjectMode). The other fields can be dummy values under the emulator.
// `||` (not `??`) so an empty `VITE_FIREBASE_X=` line also falls back.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-app.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-app',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-app.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'demo-app-id',
}

export const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)

// Wire the emulators exactly once, in DEV only. The getApps()-style guard would
// re-run under HMR (module re-eval), so we track it on the app instance itself.
const appWithFlag = firebaseApp as typeof firebaseApp & { __acEmulators?: boolean }
if (import.meta.env.DEV && !appWithFlag.__acEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  appWithFlag.__acEmulators = true
}
