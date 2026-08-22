import { getIdToken } from "@/lib/firebase/auth";
import type { Gender } from "@/lib/types";

export interface StoredPhoto {
  /** R2 object key. Empty when the photo only exists locally in this tab. */
  key: string;
  /** Short-lived signed URL, or a local object URL for the offline fallback. */
  url: string;
}

async function authHeaders(): Promise<Record<string, string> | null> {
  const token = await getIdToken();
  return token ? { authorization: `Bearer ${token}` } : null;
}

async function messageFrom(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

/**
 * Sends the photo to our own route, which checks it and writes it to the
 * private R2 bucket. The browser never touches an R2 credential.
 */
export async function uploadPhoto(file: File): Promise<StoredPhoto> {
  const headers = await authHeaders();
  if (!headers) {
    console.warn(
      "[glowzen] Not signed in, so the photo stays in this tab only. " +
        "Enable Authentication → Sign-in method → Anonymous in the Firebase console.",
    );
    return { key: "", url: URL.createObjectURL(file) };
  }

  const response = await fetch("/api/photos", {
    method: "POST",
    headers: { ...headers, "content-type": file.type },
    body: file,
  });

  if (response.status === 503) {
    console.warn("[glowzen] R2 isn't configured, so the photo stays in this tab only.");
    return { key: "", url: URL.createObjectURL(file) };
  }
  if (!response.ok) {
    throw new Error(await messageFrom(response, "We couldn't save that photo."));
  }

  const { key } = (await response.json()) as { key: string };
  const url = (await getPhotoUrl(key)) ?? URL.createObjectURL(file);
  return { key, url };
}

/**
 * Signed read URLs live for ten minutes. Holding one for eight and re-signing
 * after that keeps a stored render from costing a round trip every time the
 * user walks back onto the screen showing it, with two minutes of headroom so
 * a URL handed out at the edge of the window still loads.
 */
const URL_CACHE_MS = 8 * 60_000;
const signedUrls = new Map<string, { url: string; until: number }>();

/** Fresh signed URL for a stored photo. Null if it's gone or unreadable. */
export async function getPhotoUrl(key: string): Promise<string | null> {
  if (!key) return null;

  const cached = signedUrls.get(key);
  if (cached && cached.until > Date.now()) return cached.url;

  const headers = await authHeaders();
  if (!headers) return null;

  const response = await fetch("/api/photos/view", {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ key }),
  });

  if (!response.ok) return null;
  const { url } = (await response.json()) as { url: string };
  signedUrls.set(key, { url, until: Date.now() + URL_CACHE_MS });
  return url;
}

export async function deletePhotos(): Promise<void> {
  const headers = await authHeaders();
  if (!headers) return;
  // The objects are going away, so no signed URL for them is worth keeping.
  signedUrls.clear();
  await fetch("/api/photos", { method: "DELETE", headers });
}

export type PreviewKind = "hairstyle" | "makeup" | "beard";

/**
 * Renders one change onto the user's stored selfie. Returns the object key and
 * a signed URL for it; the key is what gets persisted, since URLs expire.
 *
 * `gender` is the presentation the person chose in the questionnaire — the same
 * cut name hangs differently on a masculine and a feminine head of hair, and
 * without it the model reads one off the face.
 */
export async function generatePreviewImage(input: {
  photoKey: string;
  kind: PreviewKind;
  detail: string;
  notes?: string;
  gender?: Gender | null;
}): Promise<StoredPhoto> {
  const headers = await authHeaders();
  if (!headers) throw new PreviewError("Sign-in is needed to render a preview.", "unauthenticated");

  const response = await fetch("/api/preview", {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string; code?: string }
      | null;
    throw new PreviewError(body?.error ?? "That preview didn't render.", body?.code);
  }

  const { key } = (await response.json()) as { key: string };
  const url = await getPhotoUrl(key);
  if (!url) throw new PreviewError("We rendered it but couldn't load it back.", "unreadable");
  return { key, url };
}

/** Carries the server's code so callers can tell "not set up" from "failed". */
export class PreviewError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}
