// src/firebase/config.js
//
// Initializes the Firebase app, Auth, Firestore, and Storage singletons
// used throughout MediSphere. All credentials come from environment
// variables (see .env.example) so this file never needs editing per
// developer — only the .env file changes between environments.

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Guard against re-initializing during hot module reload in dev
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Persist auth session across browser restarts (until explicit logout
// or the session-timeout logic in useSessionTimeout signs the user out)
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Failed to set auth persistence:", err);
});

// Optional: point at local emulators when VITE_USE_FIREBASE_EMULATORS=true
// Run `firebase emulators:start` first. Useful for local dev/seed testing
// without touching production Firestore.
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true") {
  connectFirestoreEmulator(db, "localhost", 8080);
  connectStorageEmulator(storage, "localhost", 9199);
  console.info("[MediSphere] Connected to Firebase emulators");
}

export { app, auth, db, storage };
