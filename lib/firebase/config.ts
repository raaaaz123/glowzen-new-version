import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
};

/** False when .env.local is missing; the app then keeps everything on-device. */
export const isFirebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

/** Firebase only ever initialises in the browser — nothing here runs during SSR. */
const isBrowser = typeof window !== "undefined";

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseEnabled || !isBrowser) return null;
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

let db: Firestore | null = null;

export function getDb(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (db) return db;
  try {
    // An optional field that comes back absent arrives as undefined, and
    // Firestore rejects the whole write for one of them. Dropping them is the
    // documented behaviour we want: absent stays absent.
    db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch {
    // Already initialised elsewhere (fast refresh, or a second call).
    db = getFirestore(app);
  }
  return db;
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

/** Analytics needs a supported browser environment, so it loads lazily. */
export async function initAnalytics() {
  const app = getFirebaseApp();
  if (!app || !firebaseConfig.measurementId) return null;
  const { getAnalytics, isSupported } = await import("firebase/analytics");
  return (await isSupported()) ? getAnalytics(app) : null;
}
