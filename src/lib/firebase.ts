/**
 * @fileoverview Inicialización del SDK Cliente de Firebase - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Centralización de Servicios:
 *    - Configura e inicializa la instancia singleton de Firebase para la aplicación web.
 *    - Exporta los servicios nucleares: Firestore (`db`), Auth (`auth`), Storage (`storage`) y Analytics (`analytics`)[cite: 1].
 * 2. Patrón Singleton para Next.js:
 *    - Evalúa `getApps().length` para evitar reinicializaciones redundantes durante recargas en caliente (Fast Refresh)[cite: 1, 2].
 * 3. Aislamiento Seguro en SSR:
 *    - Condiciona la carga de Firebase Analytics al entorno del navegador (`typeof window !== "undefined"`)
 *      y a la verificación asíncrona de `isSupported()`[cite: 1].
 */

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";
import { getAuth, Auth } from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage";

/**
 * Parámetros de configuración del proyecto Firebase.
 * Consumidos de forma segura desde las variables de entorno públicas (.env.local)[cite: 1, 2].
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
 * Inicialización Singleton de la App de Firebase:
 * Si ya existe una instancia activa la reutiliza (`getApp()`), de lo contrario la inicializa (`initializeApp()`)[cite: 1, 2].
 */
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

/**
 * Instancia central de base de datos Firestore[cite: 1].
 */
const db: Firestore = getFirestore(app);

/**
 * Servicio de Autenticación de usuarios y empleados[cite: 1].
 */
const auth: Auth = getAuth(app);

/**
 * Servicio de almacenamiento en la nube para multimedia y recursos estáticos[cite: 1].
 */
const storage: FirebaseStorage = getStorage(app);

/**
 * Inicialización condicional de Firebase Analytics para evitar fallas durante SSR[cite: 1].
 */
let analytics: Analytics | undefined;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, db, analytics, auth, storage };