import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  setDoc,
  type DocumentData,
} from "firebase/firestore";
import { getDb } from "./config";

/**
 * The names live in `./collections` so the server routes can read them without
 * dragging the browser SDK along. Re-exported here because every call site in
 * the app already imports them from this module.
 */
export { WEB_NAMESPACE, collections, paths } from "./collections";

/**
 * Firestore is optional infrastructure here: every screen has local data to fall
 * back on. So a failure is a note, not a stack trace — and a ruleset that hasn't
 * been published yet is a setup step, not an error. Each distinct problem is
 * reported once per session instead of on every read.
 */
const reported = new Set<string>();

function note(action: string, path: string, error: unknown) {
  const code = (error as { code?: string })?.code ?? "unknown";

  if (code === "permission-denied") {
    if (reported.has("permission-denied")) return;
    reported.add("permission-denied");
    console.info(
      "[glowzen] Firestore rules haven't been published for glowzen_web_users yet, " +
        "so history and progress stay on this device. " +
        "Paste firebase/firestore.rules into Firebase Console → Firestore → Rules " +
        "(merge with your existing glowface_* rules — don't replace them).",
    );
    return;
  }

  const key = `${code}:${action}:${path}`;
  if (reported.has(key)) return;
  reported.add(key);
  console.warn(`[glowzen] Firestore ${action} failed for ${path} (${code})`, error);
}

/**
 * Every helper degrades to the supplied fallback rather than throwing, so a
 * locked-down ruleset or an offline device never breaks a screen.
 */
export async function readDoc<T>(path: string, fallback: T): Promise<T> {
  const db = getDb();
  if (!db) return fallback;
  try {
    const snap = await getDoc(doc(db, path));
    return snap.exists() ? ({ ...fallback, ...(snap.data() as Partial<T>) } as T) : fallback;
  } catch (error) {
    note("read", path, error);
    return fallback;
  }
}

export async function writeDoc<T extends DocumentData>(path: string, data: T): Promise<T> {
  const db = getDb();
  if (!db) return data;
  try {
    await setDoc(doc(db, path), { ...data, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    note("write", path, error);
  }
  return data;
}

export async function listDocs<T>(
  path: string,
  fallback: T[],
  options?: { orderByField?: string; direction?: "asc" | "desc"; limit?: number },
): Promise<T[]> {
  const db = getDb();
  if (!db) return fallback;
  try {
    const base = collection(db, path);
    const constraints = [
      ...(options?.orderByField
        ? [orderBy(options.orderByField, options.direction ?? "desc")]
        : []),
      ...(options?.limit ? [fbLimit(options.limit)] : []),
    ];
    const snap = await getDocs(constraints.length ? query(base, ...constraints) : base);
    if (snap.empty) return fallback;
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
  } catch (error) {
    note("list", path, error);
    return fallback;
  }
}

export async function removeDoc(path: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    note("delete", path, error);
  }
}

export async function removeCollection(path: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, path));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  } catch (error) {
    note("collection delete", path, error);
  }
}
