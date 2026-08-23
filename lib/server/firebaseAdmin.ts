import "server-only";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK — server-side only.
 *
 * Used by the Polar webhook and /api/checkout/confirm to write subscription
 * status to Firestore. Those writes have to bypass the client security rules:
 * the whole point is that the browser cannot set its own subscription.
 *
 * Set FIREBASE_SERVICE_ACCOUNT_KEY to the service account JSON (Firebase
 * console → Project settings → Service accounts). Application default
 * credentials are used when it is absent, which works on Google-hosted
 * runtimes and nowhere else — on Vercel a missing key surfaces as
 * "Could not load the default credentials" on the first write.
 */
let _app: App | null = null;
let _db: Firestore | null = null;

/**
 * The service account, if one is configured.
 *
 * A malformed key throws here rather than silently falling through to default
 * credentials — a webhook that half-works is worse than one that reports why.
 */
function serviceAccount(): Record<string, unknown> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON: ${(error as Error).message}`,
    );
  }

  // Pasting the JSON into a dashboard env field usually flattens the newlines
  // in the private key into literal backslash-n, which the crypto layer
  // rejects with an unhelpful error.
  const key = parsed.private_key;
  if (typeof key === "string" && key.includes("\\n")) {
    parsed.private_key = key.replace(/\\n/g, "\n");
  }
  return parsed;
}

function getAdminApp(): App {
  if (_app) return _app;
  const existing = getApps().find((app) => app.name === "admin");
  if (existing) {
    _app = existing;
    return _app;
  }

  const sa = serviceAccount();
  if (!sa) {
    console.warn(
      "[firebase-admin] FIREBASE_SERVICE_ACCOUNT_KEY is not set; falling back to application default credentials.",
    );
  }

  _app = initializeApp(
    { credential: sa ? cert(sa) : applicationDefault() },
    "admin",
  );
  return _app;
}

export function getAdminDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(getAdminApp());
  return _db;
}
