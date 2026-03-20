import { initializeApp, getApps, getApp } from 'firebase/app'
import { initializeFirestore, getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyDhaES2k1M9ZXqy6u04FO1Xkobs-bOEIA0',
  authDomain: 'pocketcare-personalcare.firebaseapp.com',
  projectId: 'pocketcare-personalcare',
  storageBucket: 'pocketcare-personalcare.firebasestorage.app',
  messagingSenderId: '744023236008',
  appId: '1:744023236008:web:985106624fc8e0e45b919d',
}

// Prevent double initialization (hot reload safe)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Use long polling for React Native compatibility
let db: ReturnType<typeof initializeFirestore>
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  })
} catch {
  db = getFirestore(app)
}

export const storage = getStorage(app)
export { db }
export default app