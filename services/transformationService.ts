import { currentUid } from "@/lib/firebase/auth";
import { paths, readDoc, writeDoc } from "@/lib/firebase/firestore";
import { generatePreviewImage, getPhotoUrl } from "@/lib/storage/photos";
import type {
  BeardStyle,
  Gender,
  Hairstyle,
  TransformationResult,
} from "@/lib/types";
import { getAnalysis, getBeard } from "./analysisService";
import { saveSavedStyle } from "./userService";

/**
 * Matched in the same Gemini pass as the analysis, against the presentation the
 * person gave the questionnaire — so these are already gender-appropriate cuts,
 * and `gender` here only picks which stored analysis to read.
 */
export async function getHairstyles(gender: Gender | null): Promise<Hairstyle[]> {
  const analysis = await getAnalysis(gender);
  return analysis.hairstyles ?? [];
}

export async function getHairstyle(
  gender: Gender | null,
  id: string,
): Promise<Hairstyle | null> {
  const styles = await getHairstyles(gender);
  return styles.find((s) => s.id === id) ?? null;
}

/**
 * One stored render. `photoKey` is which selfie it was rendered from: style ids
 * are derived from the cut's name and rank, so a second analysis can reissue an
 * id a previous render already used. Without the photo recorded alongside, a
 * user who re-uploads gets yesterday's face back under today's id.
 */
interface PreviewEntry {
  key: string;
  photoKey: string;
}

/** previewId → stored render. Renders are expensive, so they're kept. */
interface PreviewDoc {
  /** Entries written before renders were tied to a photo are bare keys. */
  images: Record<string, string | PreviewEntry>;
}

const EMPTY_PREVIEWS: PreviewDoc = { images: {} };

const entryOf = (stored: string | PreviewEntry | undefined): PreviewEntry | null =>
  typeof stored === "string"
    ? { key: stored, photoKey: "" }
    : stored?.key
      ? stored
      : null;

/**
 * A render belongs to this screen if it came from the selfie on screen. Legacy
 * entries carry no photo, so they're taken at face value — they were rendered
 * from whatever selfie was current, and re-rendering them costs real money.
 */
const matchesPhoto = (entry: PreviewEntry, photoKey?: string | null) =>
  !entry.photoKey || !photoKey || entry.photoKey === photoKey;

/** One render per id and photo at a time — each is a paid image call. */
const inFlight = new Map<string, Promise<string>>();

function once(id: string, make: () => Promise<string>): Promise<string> {
  const existing = inFlight.get(id);
  if (existing) return existing;
  const promise = make().finally(() => inFlight.delete(id));
  inFlight.set(id, promise);
  return promise;
}

/**
 * The render already paid for, if there is one for this id on this photo.
 * Returns null rather than throwing — a missing cache entry is not an error,
 * it just means nothing has been rendered yet.
 */
export async function cachedPreview(
  id: string,
  photoKey?: string | null,
): Promise<string | null> {
  const uid = await currentUid();
  const doc = await readDoc<PreviewDoc>(paths.previews(uid), EMPTY_PREVIEWS);
  const entry = entryOf(doc.images?.[id]);
  if (!entry || !matchesPhoto(entry, photoKey)) return null;
  return getPhotoUrl(entry.key);
}

/**
 * Which ids already have a render stored for this photo — one read for the
 * whole screen, so a list can say what's free to view before the user taps and
 * finds out it costs a render.
 */
export async function savedPreviewIds(photoKey?: string | null): Promise<Set<string>> {
  const uid = await currentUid();
  const doc = await readDoc<PreviewDoc>(paths.previews(uid), EMPTY_PREVIEWS);
  const ids = new Set<string>();
  for (const [id, stored] of Object.entries(doc.images ?? {})) {
    const entry = entryOf(stored);
    if (entry && matchesPhoto(entry, photoKey)) ids.add(id);
  }
  return ids;
}

/**
 * Writes the one entry and lets Firestore's merge keep the rest, so two renders
 * finishing at once can't overwrite each other's row.
 */
async function rememberPreview(id: string, entry: PreviewEntry) {
  const uid = await currentUid();
  await writeDoc(paths.previews(uid), { images: { [id]: entry } });
}

/**
 * Renders the cut onto the user's own selfie. The stored photo is the model's
 * reference, so the face that comes back is theirs — see lib/server/previewPrompt.
 * Results are cached per style, because each one is a paid image call.
 */
export async function generatePreview(
  gender: Gender | null,
  styleId: string,
  photoKey?: string | null,
): Promise<TransformationResult> {
  // The analysis, not the current selection, is what the cut was matched for.
  // If the two ever disagree the render has to follow the cut, or a masculine
  // taper comes back rendered as a feminine one.
  const analysis = await getAnalysis(gender);
  const style = analysis.hairstyles?.find((s) => s.id === styleId);
  if (!style) throw new Error("We couldn't find that style. Pick another one.");

  const base = { styleId, caption: `${style.name} · ${style.match}% match` };

  const cached = await cachedPreview(styleId, photoKey);
  if (cached) return { ...base, after: cached };

  if (!photoKey) {
    throw new Error("Add a photo first — previews are rendered on your own face.");
  }

  // Keyed by photo as well, so re-uploading mid-render doesn't join the render
  // of the old selfie and then store it against the new one.
  const url = await once(`${styleId}:${photoKey}`, async () => {
    const result = await generatePreviewImage({
      photoKey,
      kind: "hairstyle",
      detail: style.name,
      notes: style.barberNotes,
      gender: analysis.gender ?? gender,
    });
    await rememberPreview(styleId, { key: result.key, photoKey });
    return result.url;
  });

  return { ...base, after: url };
}

/**
 * Same pipeline for a beard shape — including a clean shave, which is a change
 * like any other and worth seeing before committing to a razor.
 */
export async function generateBeardPreview(
  gender: Gender | null,
  styleId: string,
  photoKey?: string | null,
): Promise<TransformationResult> {
  const beard = await getBeard(gender);
  const style = beard.styles.find((s) => s.id === styleId);
  if (!style) throw new Error("We couldn't find that shape. Pick another one.");

  const base = { styleId, caption: `${style.name} · ${style.match}% match` };

  const cached = await cachedPreview(styleId, photoKey);
  if (cached) return { ...base, after: cached };

  if (!photoKey) {
    throw new Error("Add a photo first — previews are rendered on your own face.");
  }

  const url = await once(`${styleId}:${photoKey}`, async () => {
    const result = await generatePreviewImage({
      photoKey,
      kind: "beard",
      detail: style.name,
      notes: style.barberNotes,
    });
    await rememberPreview(styleId, { key: result.key, photoKey });
    return result.url;
  });

  return { ...base, after: url };
}

/** One shape from the reading, by id. */
export async function getBeardStyle(
  gender: Gender | null,
  id: string,
): Promise<BeardStyle | null> {
  const beard = await getBeard(gender);
  return beard.styles.find((s) => s.id === id) ?? null;
}

/** Same pipeline for a makeup look, rendered on the same face. */
export async function generateMakeupPreview(
  look: { id: string; name: string; steps: string[] },
  photoKey?: string | null,
): Promise<string> {
  const cached = await cachedPreview(look.id, photoKey);
  if (cached) return cached;

  if (!photoKey) {
    throw new Error("Add a photo first — previews are rendered on your own face.");
  }

  return once(`${look.id}:${photoKey}`, async () => {
    const result = await generatePreviewImage({
      photoKey,
      kind: "makeup",
      detail: look.name,
      notes: look.steps.join(". "),
    });
    await rememberPreview(look.id, { key: result.key, photoKey });
    return result.url;
  });
}

export async function saveStyle(styleId: string): Promise<string> {
  await saveSavedStyle(styleId);
  return styleId;
}
