// Single Firebase client entry point. Everything auth/Firestore-related in the
// app goes through here — nothing else calls initializeApp / initializeFirestore.
//
// Local-first dev is preserved: in DEV we point Auth + Firestore at the local
// emulators (same suite that already serves the Functions API), so
// `npm run dev` still needs no real Firebase project or internet. In prod the
// VITE_FIREBASE_* values come from the console (Project settings → SDK setup).
//
// Firestore runs with its persistent offline cache: for Club members it IS the
// storage engine (offline reads, queued writes, live multi-device sync). The
// cache can be wiped at sign-out (`clearCloudCache`), which replaces the
// Firestore instance — so callers always use `db()`, never a saved reference.

import { initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  clearIndexedDbPersistence,
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
  type Firestore,
} from 'firebase/firestore'

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

// State kept on the app instance so HMR (module re-evaluation) reuses it
// instead of initializing twice.
const holder = firebaseApp as FirebaseApp & { __acDb?: Firestore; __acAuthEmulator?: boolean }

function createDb(): Firestore {
  const instance = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    // Optional Session fields (e.g. sixPlayerFormat on 4-player games) are
    // `undefined`, which Firestore rejects unless told to drop them.
    ignoreUndefinedProperties: true,
  })
  if (import.meta.env.DEV) connectFirestoreEmulator(instance, '127.0.0.1', 8080)
  return instance
}

if (import.meta.env.DEV && !holder.__acAuthEmulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  holder.__acAuthEmulator = true
}

/** The current Firestore instance (replaced by `clearCloudCache`). */
export function db(): Firestore {
  holder.__acDb ??= createDb()
  return holder.__acDb
}

/**
 * Wipes Firestore's offline cache on this device (sign-out / account
 * deletion), so the next person using it can't read the previous account's
 * cached games. Listeners must be detached first.
 */
export async function clearCloudCache(): Promise<void> {
  const current = holder.__acDb
  if (!current) return
  holder.__acDb = undefined
  await terminate(current)
  try {
    await clearIndexedDbPersistence(current)
  } catch (err) {
    // Fails while another tab still has the cache open. Signing out must not
    // fail because of it; the security rules still keep the data private.
    console.warn('[cloud] could not clear the offline cache (another tab open?)', err)
  }
}
