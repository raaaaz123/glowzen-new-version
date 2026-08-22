import { onAuthStateChanged, signInAnonymously, signOut as fbSignOut } from "firebase/auth";
import { getFirebaseAuth, isFirebaseEnabled } from "./config";

export interface SessionUser {
  uid: string;
  displayName: string | null;
  isAnonymous: boolean;
  /** True when the uid is local-only because Firebase Auth wasn't reachable. */
  offline: boolean;
}

const LOCAL_UID_KEY = "glow.localUid";

/**
 * Stable per-browser id used when anonymous auth is unavailable — for example
 * before Anonymous sign-in is enabled in the Firebase console.
 */
function localUid(): string {
  if (typeof window === "undefined") return "local-ssr";
  let uid = window.localStorage.getItem(LOCAL_UID_KEY);
  if (!uid) {
    uid = `local-${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(LOCAL_UID_KEY, uid);
  }
  return uid;
}

function offlineSession(): SessionUser {
  return { uid: localUid(), displayName: null, isAnonymous: true, offline: true };
}

let cached: Promise<SessionUser> | null = null;

export function signInAnonymous(): Promise<SessionUser> {
  if (cached) return cached;

  cached = (async () => {
    const auth = getFirebaseAuth();
    if (!auth) return offlineSession();

    try {
      const existing = auth.currentUser ?? (await signInAnonymously(auth)).user;
      return {
        uid: existing.uid,
        displayName: existing.displayName,
        isAnonymous: existing.isAnonymous,
        offline: false,
      };
    } catch (error) {
      console.warn(
        "[glowzen] Anonymous sign-in failed — falling back to a local id. " +
          "Enable Authentication → Sign-in method → Anonymous in the Firebase console.",
        error,
      );
      return offlineSession();
    }
  })();

  return cached;
}

export async function currentUid(): Promise<string> {
  return (await signInAnonymous()).uid;
}

/** Current Firebase ID token, or null when auth is unavailable. */
export async function getIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  const session = await signInAnonymous();
  if (session.offline || !auth.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return null;
  }
}

export function onSession(cb: (user: SessionUser | null) => void) {
  const auth = getFirebaseAuth();
  if (!auth) {
    cb(offlineSession());
    return () => {};
  }
  return onAuthStateChanged(auth, (user) =>
    cb(
      user
        ? {
            uid: user.uid,
            displayName: user.displayName,
            isAnonymous: user.isAnonymous,
            offline: false,
          }
        : null,
    ),
  );
}

export async function signOut(): Promise<void> {
  cached = null;
  const auth = getFirebaseAuth();
  if (auth && isFirebaseEnabled) await fbSignOut(auth);
}
