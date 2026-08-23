import { onAuthStateChanged, signInAnonymously, signOut as fbSignOut } from "firebase/auth";
import { getFirebaseAuth, isFirebaseEnabled } from "./config";
import { mixpanelIdentify, mixpanelPeopleSet, mixpanelReset } from "../mixpanel";

export interface SessionUser {
  uid: string;
  displayName: string | null;
  isAnonymous: boolean;
  /** True when the uid is local-only because Firebase Auth wasn't reachable. */
  offline: boolean;
}

const LOCAL_UID_KEY = "glow.localUid";
/** Persisted anonymous uid so we can detect if Firebase silently assigns a new one. */
const ANON_UID_KEY = "glow.anonUid";

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
      const isNewUser = !auth.currentUser;
      const existing = auth.currentUser ?? (await signInAnonymously(auth)).user;
      const session: SessionUser = {
        uid: existing.uid,
        displayName: existing.displayName,
        isAnonymous: existing.isAnonymous,
        offline: false,
      };

      // Persist the anonymous uid so we can detect data-loss scenarios.
      if (typeof window !== "undefined") {
        const prev = window.localStorage.getItem(ANON_UID_KEY);
        if (prev && prev !== session.uid) {
          console.warn(
            `[glowzen] Anonymous uid changed from ${prev} to ${session.uid}. ` +
              "Previous session data may be inaccessible.",
          );
        }
        window.localStorage.setItem(ANON_UID_KEY, session.uid);
      }
      
      mixpanelIdentify(session.uid);
      mixpanelPeopleSet({
        $name: session.displayName || "Anonymous User",
        is_anonymous: session.isAnonymous,
      });

      if (isNewUser) {
        import("../mixpanel").then(({ mixpanelTrack }) => {
          mixpanelTrack("sign_up_completed", {
            sign_up_method: "anonymous",
            platform: "web",
          });
        });
      }

      return session;
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
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      mixpanelIdentify(user.uid);
      mixpanelPeopleSet({
        $name: user.displayName || "Anonymous User",
        is_anonymous: user.isAnonymous,
      });
      cb({
        uid: user.uid,
        displayName: user.displayName,
        isAnonymous: user.isAnonymous,
        offline: false,
      });
    } else {
      cb(null);
    }
  });
}

/**
 * Signs the anonymous user out of Firebase Auth.
 *
 * ⚠️  For anonymous auth this destroys the only link to the user's data.
 *     Only call this from `deleteAccount()` — never expose it as a UI action.
 */
export async function signOut(): Promise<void> {
  cached = null;
  // Clear persisted uid so the next session doesn't warn about a mismatch.
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ANON_UID_KEY);
  }
  const auth = getFirebaseAuth();
  if (auth && isFirebaseEnabled) {
    await fbSignOut(auth);
  }
  mixpanelReset();
}

