// Lazily-initialized Firebase Admin singletons. Import `adminAuth` / `adminDb`
// wherever the Functions need to verify ID tokens or write Firestore. Kept in
// one place so initializeApp() runs at most once per instance.
//
// No explicit credentials: in production the Functions runtime injects the
// default service account; under the emulator the suite sets
// FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST and admin picks them up.

import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

if (getApps().length === 0) {
  initializeApp()
}

export const adminAuth = getAuth()
export const adminDb = getFirestore()
