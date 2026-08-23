import type { Choice, ChoiceDef, Gender, QuestionnaireAnswers } from "@/lib/types";
import type { Vars } from "@/lib/i18n/translate";

/**
 * The question sets, as ids and dictionary keys only.
 *
 * The id is what gets stored on the user and sent to the model, so it never
 * changes with the language. The key points at `choices.<category>.<key>` in
 * the dictionaries, which is where the words the person actually reads live.
 *
 * Where a category needs different wording per gender — "Facial hair" vs
 * "Brows & lashes" behind the same `grooming` id — the key carries the suffix
 * and the id does not.
 */

export const GENDER_CHOICES: ChoiceDef[] = [
  { id: "male", key: "male", hint: true },
  { id: "female", key: "female", hint: true },
  { id: "neutral", key: "neutral", hint: true },
];

/**
 * Age is asked for exactly, in years, rather than as a bucket — a 19-year-old
 * and a 24-year-old want different things from the same "18-24" band, and the
 * model reads the number straight.
 */
export const AGE_MIN = 13;
export const AGE_MAX = 90;
export const AGE_DEFAULT = 24;

export const clampAge = (value: number) =>
  Math.min(AGE_MAX, Math.max(AGE_MIN, Math.round(value)));

/** The buckets we used to store, mapped to the middle of each band. */
const LEGACY_AGE: Record<string, number> = {
  "under-18": 17,
  "18-24": 21,
  "25-34": 29,
  "35-44": 39,
  "45-plus": 50,
};

/**
 * Answers as stored may predate exact ages — either in Firestore or in a
 * browser that cached the old shape. Read the old field once, then let it go.
 */
export function normalizeAnswers(
  stored: Partial<QuestionnaireAnswers> & { ageRange?: unknown } = {},
): Partial<QuestionnaireAnswers> {
  const { ageRange, ...rest } = stored;
  if (typeof rest.age === "number" && Number.isFinite(rest.age)) {
    return { ...rest, age: clampAge(rest.age) };
  }
  if (typeof ageRange === "string" && ageRange in LEGACY_AGE) {
    return { ...rest, age: LEGACY_AGE[ageRange] };
  }
  return { ...rest, age: null };
}

type ChoiceSet = Record<Gender, ChoiceDef[]>;

const focusBase: ChoiceDef[] = [
  { id: "full", key: "full", hint: true },
  { id: "face", key: "face", hint: true },
  { id: "hair", key: "hair", hint: true },
];

const focusTail: ChoiceDef[] = [
  { id: "skin", key: "skin", hint: true },
  { id: "style", key: "style", hint: true },
];

export const FOCUS_CHOICES: ChoiceSet = {
  male: [...focusBase, { id: "grooming", key: "groomingMale", hint: true }, ...focusTail],
  female: [...focusBase, { id: "grooming", key: "groomingFemale", hint: true }, ...focusTail],
  neutral: [...focusBase, { id: "grooming", key: "groomingNeutral", hint: true }, ...focusTail],
};

const aestheticShared: ChoiceDef[] = [
  { id: "clean", key: "clean" },
  { id: "model", key: "model" },
  { id: "athletic", key: "athletic" },
  { id: "professional", key: "professional" },
  { id: "streetwear", key: "streetwear" },
  { id: "old-money", key: "old-money" },
  { id: "custom", key: "custom" },
];

export const AESTHETIC_CHOICES: ChoiceSet = {
  male: [aestheticShared[0], { id: "masculine", key: "masculine" }, ...aestheticShared.slice(1)],
  female: [aestheticShared[0], { id: "feminine", key: "feminine" }, ...aestheticShared.slice(1)],
  neutral: [
    aestheticShared[0],
    { id: "androgynous", key: "androgynous" },
    ...aestheticShared.slice(1),
  ],
};

const concernHead: ChoiceDef[] = [
  { id: "hairstyle", key: "hairstyle" },
  { id: "definition", key: "definition" },
  { id: "skin", key: "skin" },
];

const concernTail: ChoiceDef[] = [
  { id: "style", key: "style" },
  { id: "overall", key: "overall" },
];

export const CONCERN_CHOICES: ChoiceSet = {
  male: [
    ...concernHead,
    { id: "facial-hair", key: "facial-hair" },
    { id: "brows", key: "browsMale" },
    ...concernTail,
  ],
  female: [
    ...concernHead,
    { id: "brows", key: "browsFemale" },
    { id: "hair-health", key: "hair-health" },
    ...concernTail,
  ],
  neutral: [
    ...concernHead,
    { id: "brows", key: "browsNeutral" },
    { id: "facial-hair", key: "facial-hair" },
    ...concernTail,
  ],
};

export const HAIR_TYPE_CHOICES: ChoiceDef[] = [
  { id: "straight", key: "straight" },
  { id: "wavy", key: "wavy" },
  { id: "curly", key: "curly" },
  { id: "coily", key: "coily" },
];

export const HAIR_LENGTH_CHOICES: ChoiceSet = {
  male: [
    { id: "buzzed", key: "buzzed" },
    { id: "short", key: "short" },
    { id: "medium", key: "medium" },
    { id: "long", key: "long" },
  ],
  female: [
    { id: "pixie", key: "pixie" },
    { id: "bob", key: "bob" },
    { id: "shoulder", key: "shoulder" },
    { id: "long", key: "longFemale" },
  ],
  neutral: [
    { id: "buzzed", key: "buzzed" },
    { id: "short", key: "short" },
    { id: "medium", key: "medium" },
    { id: "long", key: "long" },
  ],
};

export const SKIN_TYPE_CHOICES: ChoiceDef[] = [
  { id: "dry", key: "dry" },
  { id: "oily", key: "oily" },
  { id: "combination", key: "combination" },
  { id: "normal", key: "normal" },
  { id: "sensitive", key: "sensitive" },
  { id: "unsure", key: "unsure" },
];

/** Multi-select, capped — a list of eight concerns isn't a priority list. */
export const SKIN_CONCERN_CHOICES: ChoiceDef[] = [
  { id: "breakouts", key: "breakouts" },
  { id: "texture", key: "texture" },
  { id: "redness", key: "redness" },
  { id: "dark-circles", key: "dark-circles" },
  { id: "dryness", key: "dryness" },
  { id: "oiliness", key: "oiliness" },
  { id: "dullness", key: "dullness" },
  { id: "none", key: "none" },
];

export const MAX_SKIN_CONCERNS = 3;

export const DAILY_MINUTES_CHOICES: ChoiceDef[] = [
  { id: "under-5", key: "under-5" },
  { id: "5-15", key: "5-15" },
  { id: "15-30", key: "15-30" },
  { id: "30-plus", key: "30-plus" },
];

export const COMMITMENT_CHOICES: ChoiceDef[] = [
  { id: "small", key: "small", hint: true },
  { id: "moderate", key: "moderate", hint: true },
  { id: "anything", key: "anything", hint: true },
];

export const PRIORITY_CHOICES: ChoiceDef[] = [
  { id: "natural", key: "natural" },
  { id: "attractive", key: "attractive" },
  { id: "confident", key: "confident" },
  { id: "style", key: "style" },
];

/** Which dictionary branch a list's keys sit under. */
export type ChoiceCategory =
  | "gender"
  | "focus"
  | "aesthetic"
  | "concern"
  | "hairType"
  | "hairLength"
  | "skinType"
  | "skinConcern"
  | "dailyMinutes"
  | "commitment"
  | "priority";

type Translate = (path: string, vars?: Vars) => string;

/**
 * Turns definitions into the labelled choices a component renders.
 *
 * Entries with a hint are stored as `{ label, hint }`; the rest are plain
 * strings, which keeps the dictionaries readable rather than wrapping every
 * one-word option in an object with a null field.
 */
export function resolveChoices(
  t: Translate,
  category: ChoiceCategory,
  defs: { id: string; key: string; hint?: boolean }[],
): Choice[] {
  return defs.map((def) => ({
    id: def.id,
    label: t(`choices.${category}.${def.key}${def.hint ? ".label" : ""}`),
    hint: def.hint ? t(`choices.${category}.${def.key}.hint`) : undefined,
  }));
}

/** One label, for the profile screen reading an answer back. */
export function labelFor(
  t: Translate,
  category: ChoiceCategory,
  defs: { id: string; key: string; hint?: boolean }[],
  id: string | null,
): string {
  const def = defs.find((d) => d.id === id);
  if (!def) return t("common.notSet");
  return t(`choices.${category}.${def.key}${def.hint ? ".label" : ""}`);
}
