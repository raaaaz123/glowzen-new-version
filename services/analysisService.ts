import { currentUid, getIdToken } from "@/lib/firebase/auth";
import { listDocs, paths, readDoc, writeDoc } from "@/lib/firebase/firestore";
import { getPhotoUrl, uploadPhoto } from "@/lib/storage/photos";
import { EmptyError } from "@/lib/emptyError";
import { st, stLongDate, stShortDate } from "@/lib/i18n/runtime";
import { getRuntimeLocale } from "@/lib/i18n/runtime";
import type {
  Analysis,
  BeardProfile,
  BeardStyle,
  Gender,
  MakeupProfile,
  Opportunity,
  OpportunityArea,
  PastScan,
  QuestionnaireAnswers,
} from "@/lib/types";
import { savePhotoKey } from "./userService";

/**
 * The loader's five lines, as dictionary keys. The screen translates them —
 * the timing is the same everywhere, the words are not.
 */
export const ANALYSIS_STAGE_KEYS = [
  "analyzing.stage1",
  "analyzing.stage2",
  "analyzing.stage3",
  "analyzing.stage4",
  "analyzing.stage5",
];

/** Thrown when the analysis failed. There is no fallback — this surfaces. */
export class AnalysisError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

export async function submitPhoto(file: File) {
  const stored = await uploadPhoto(file);
  if (stored.key) await savePhotoKey(stored.key);
  return stored;
}

/** Each card crops the user's own photo to the area it's talking about. */
const AREA_CROP: Record<string, string> = {
  hair: "object-[center_10%]",
  face: "object-[center_28%]",
  skin: "object-[center_38%]",
  grooming: "object-[center_58%]",
  style: "object-[center_75%]",
};

/** Makeup guidance is offered by default to everyone except male profiles. */
export function wantsMakeup(gender: Gender | null) {
  return gender !== "male";
}

/**
 * Facial hair is read for male profiles. The reading itself decides whether a
 * beard suits them — asking for it is not the same as recommending one.
 */
export function wantsBeard(gender: Gender | null) {
  return gender === "male";
}

export async function runAnalysis(
  gender: Gender | null,
  photoUrl?: string | null,
  photoKey?: string | null,
  answers?: Partial<QuestionnaireAnswers>,
): Promise<Analysis> {
  const token = await getIdToken();

  // No signed-in session or no stored photo means there's nothing to read.
  if (token && photoKey) {
    const response = await fetch("/api/analysis", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        photoKey,
        answers,
        wantsMakeup: wantsMakeup(gender),
        wantsBeard: wantsBeard(gender),
        // Everything the model writes — the summary, the three changes, the
        // cut names and the barber notes — comes back in this language.
        locale: getRuntimeLocale(),
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        overall: number;
        summary: string;
        scores: Analysis["scores"];
        opportunities: Omit<Opportunity, "id" | "image">[];
        hairstyles: { name: string; match: number; blurb: string; why: string; barberNotes: string; maintenance: string; tags: string[] }[];
        makeup?: Omit<MakeupProfile, "looks"> & {
          looks: Omit<MakeupProfile["looks"][number], "id" | "image">[];
        };
        beard?: Omit<BeardProfile, "styles"> & {
          styles: Omit<BeardStyle, "id" | "image">[];
        };
      };

      const photo = photoUrl ?? "";
      const analysis: Analysis = {
        id: `an_${Date.now()}`,
        createdAt: new Date().toISOString(),
        gender: gender ?? "neutral",
        source: "ai",
        overall: data.overall,
        summary: data.summary,
        photo,
        scores: data.scores,
        opportunities: data.opportunities.map((o, i) => ({
          ...o,
          id: `op_${o.area}_${i}`,
          area: o.area as OpportunityArea,
          image: photo,
          imagePosition: AREA_CROP[o.area] ?? "object-center",
          // Omitted rather than set to undefined — Firestore rejects undefined.
          // Written in the language the analysis ran in, and stored with it —
          // re-reading an old scan should show what it said on the day.
          ...(o.area === "skin" ? { disclaimer: st("disclaimers.skin") } : {}),
        })),
        hairstyles: data.hairstyles.map((h, i) => ({
          ...h,
          id: slug("style", i, h.name),
          image: null,
        })),
        makeup: data.makeup && {
          ...data.makeup,
          looks: data.makeup.looks.map((l, i) => ({
            ...l,
            id: slug("look", i, l.name),
            image: null,
          })),
        },
        beard: data.beard && {
          ...data.beard,
          styles: data.beard.styles.map((b, i) => ({
            ...b,
            id: slug("beard", i, b.name),
            image: null,
          })),
        },
      };

      const uid = await currentUid();
      await writeDoc(paths.analysis(uid, analysis.id), {
        createdAt: analysis.createdAt,
        gender: analysis.gender,
        source: analysis.source,
        overall: analysis.overall,
        summary: analysis.summary,
        photo: analysis.photo,
        photoKey,
        scores: analysis.scores,
        opportunities: analysis.opportunities,
        hairstyles: analysis.hairstyles,
        ...(analysis.makeup ? { makeup: analysis.makeup } : {}),
        ...(analysis.beard ? { beard: analysis.beard } : {}),
      });

      return analysis;
    }

    const body = (await response.json().catch(() => null)) as
      | { error?: string; code?: string }
      | null;

    throw new AnalysisError(body?.error ?? st("errors.analysisDidntComeBack"), body?.code);
  }

  throw new AnalysisError(
    token ? st("errors.addPhotoFirst") : st("errors.sessionFailed"),
    "no_photo",
  );
}

/** Stored analyses, newest first. Empty until the user has run one. */
export async function getAnalyses(limit = 12): Promise<Analysis[]> {
  const uid = await currentUid();
  return listDocs<Analysis>(paths.analyses(uid), [], {
    orderByField: "createdAt",
    direction: "desc",
    limit,
  });
}

/**
 * One stored analysis, by id. This is what the history screens read — the
 * newest analysis is not special, it's just the first row.
 */
export async function getAnalysisById(id: string): Promise<Analysis | null> {
  const uid = await currentUid();
  const stored = await readDoc<Analysis | null>(paths.analysis(uid, id), null);
  if (!stored?.createdAt) return null;
  return withFreshPhoto({ ...stored, id });
}

/**
 * Re-points an analysis at a photo URL that still works.
 *
 * `photo` is written once, at the moment the analysis runs, and it holds a
 * signed URL that dies ten minutes later — sometimes it's never written at all,
 * because the URL hadn't resolved yet when the call went out. Either way every
 * screen reading it back needs the key re-signed, opportunity crops included,
 * or it renders empty frames.
 */
async function withFreshPhoto(analysis: Analysis): Promise<Analysis> {
  const photo = await scanPhoto(analysis);
  return {
    ...analysis,
    photo,
    opportunities: (analysis.opportunities ?? []).map((o) => ({ ...o, image: photo })),
  };
}

/**
 * The photo stored on an analysis is a signed URL from the day it ran, and
 * those expire in ten minutes. Anything looking at an older analysis has to
 * re-sign from the key, or every history thumbnail is a broken frame.
 */
export async function scanPhoto(analysis: {
  photoKey?: string | null;
  photo?: string;
}): Promise<string> {
  if (analysis.photoKey) {
    const fresh = await getPhotoUrl(analysis.photoKey);
    if (fresh) return fresh;
  }
  // Scans from before photoKey was stored keep whatever they have. It may have
  // expired, which the frame handles, but there is nothing better to show.
  return analysis.photo ?? "";
}

/** Thrown when a screen needs an analysis and the user hasn't run one. */
export class NoAnalysisError extends EmptyError {
  constructor(message = st("errors.noAnalysis")) {
    super(message, { label: st("errors.startYourAnalysis"), href: "/analyze" });
  }
}

/** Most recent stored analysis. Throws when there isn't one yet. */
export async function getAnalysis(_gender: Gender | null): Promise<Analysis> {
  const [latest] = await getAnalyses(1);
  if (!latest) throw new NoAnalysisError();
  return withFreshPhoto(latest);
}

/** Shade and look guidance from the latest analysis, if there is any. */
export async function getMakeup(gender: Gender | null): Promise<MakeupProfile | null> {
  const analysis = await getAnalysis(gender);
  return analysis.makeup ?? null;
}

/** Thrown when a profile has no facial-hair reading to show. */
export class NoBeardError extends EmptyError {
  constructor(message = st("errors.noBeard")) {
    super(message, { label: st("errors.startYourAnalysis"), href: "/analyze" });
  }
}

/** The facial-hair reading from the latest analysis. Throws when there isn't one. */
export async function getBeard(gender: Gender | null): Promise<BeardProfile> {
  const analysis = await getAnalysis(gender);
  if (!analysis.beard?.styles?.length) throw new NoBeardError();
  return analysis.beard;
}

export async function getOpportunity(
  gender: Gender | null,
  id: string,
): Promise<Opportunity | null> {
  const analysis = await getAnalysis(gender);
  return analysis.opportunities.find((o) => o.id === id) ?? null;
}

export async function getPastScans(_gender: Gender | null): Promise<PastScan[]> {
  const stored = await getAnalyses(12);
  return Promise.all(
    stored.map(async (a, i) => ({
      id: a.id,
      label: i === 0 ? st("scans.latest") : st("scans.numbered", { n: stored.length - i }),
      dateLabel: stShortDate(a.createdAt),
      overall: a.overall,
      photo: await scanPhoto(a),
      topArea: a.opportunities?.[0]?.title ?? st("scans.fallbackTopArea"),
    })),
  );
}

/**
 * Long-form date for a stored analysis — "22 August 2026", "٢٢ أغسطس ٢٠٢٦",
 * "2026年8月22日". The month name and the ordering both follow the chosen
 * language, not the browser's, so a German speaker on an English phone still
 * reads a German date.
 */
export function scanDateLabel(iso: string) {
  return stLongDate(iso);
}

const slug = (prefix: string, i: number, name: string) =>
  `${prefix}-${i}-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
