import "server-only";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK — server-side only.
 *
 * Used by the Polar webhook to write subscription status to Firestore
 * without needing a client-side auth token. The default service account
 * has full Firestore access, which is fine here because the webhook
 * verifies the Polar signature before writing anything.
 *
 * In production, provide GOOGLE_APPLICATION_CREDENTIALS or the service
 * account JSON. On Firebase-hosted projects the default credentials work
 * out of the box.
 */
let _app: App | null = null;
let _db: Firestore | null = null;

function getAdminApp(): App {
  if (_app) return _app;
  const existing = getApps();
  if (existing.length) {
    _app = existing[0];
    return _app;
  }

  // Try explicit service account first, fall back to application default
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (sa) {
    try {
      const parsed = JSON.parse(sa);
      _app = initializeApp({ credential: cert(parsed) }, "admin");
    } catch {
      _app = initializeApp(undefined, "admin");
    }
  } else {
    _app = initializeApp(undefined, "admin");
  }
  return _app;
}

export function getAdminDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(getAdminApp());
  return _db;
}
