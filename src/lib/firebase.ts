/**
 * @fileoverview Firebase Client SDK Initialization
 * This file configures and exports the core Firebase services used throughout the frontend application.
 * It strictly uses environment variables to prevent exposing raw credentials in the source code.
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage"; // <-- NEW: Imported Storage

/**
 * Firebase project configuration object.
 * Pulled securely from .env.local during the build process.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/**
 * Initialize Firebase App (Singleton Pattern)
 * Next.js hot-reloads the development server frequently. Checking getApps().length
 * ensures we don't accidentally initialize multiple identical instances of Firebase,
 * which would cause a memory leak and crash the app.
 */
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Core Services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app); // <-- NEW: Initialized Storage

/**
 * Initialize Firebase Analytics safely.
 * Analytics requires the browser's `window` object to track page views.
 * The `typeof window !== "undefined"` check prevents Next.js from throwing
 * errors during Server-Side Rendering (SSR).
 */
let analytics;
if (typeof window !== "undefined") {
  isSupported().then((isSupported) => {
    if (isSupported) {
      analytics = getAnalytics(app);
    }
  });
}

// <-- NEW: Exported storage so other files can use it
export { app, db, analytics, auth, storage };