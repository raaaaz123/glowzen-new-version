import type { AgeRange, Choice, Gender } from "@/lib/types";

export const GENDER_CHOICES: Choice[] = [
  { id: "male", label: "Male", hint: "Masculine recommendations" },
  { id: "female", label: "Female", hint: "Feminine recommendations" },
  { id: "neutral", label: "Non-binary or prefer not to say", hint: "Neutral recommendations" },
];

export const AGE_CHOICES: { id: AgeRange; label: string }[] = [
  { id: "under-18", label: "Under 18" },
  { id: "18-24", label: "18–24" },
  { id: "25-34", label: "25–34" },
  { id: "35-44", label: "35–44" },
  { id: "45-plus", label: "45+" },
];

type ChoiceSet = Record<Gender, Choice[]>;

const focusBase: Choice[] = [
  { id: "full", label: "Full glow-up", hint: "Everything, ranked by impact" },
  { id: "face", label: "Face", hint: "Definition and framing" },
  { id: "hair", label: "Hair", hint: "Cut, shape, texture" },
];

const focusTail: Choice[] = [
  { id: "skin", label: "Skin", hint: "Clarity and texture" },
  { id: "style", label: "Style", hint: "Clothing and fit" },
];

export const FOCUS_CHOICES: ChoiceSet = {
  male: [
    ...focusBase,
    { id: "grooming", label: "Facial hair", hint: "Beard, stubble, neckline" },
    ...focusTail,
  ],
  female: [
    ...focusBase,
    { id: "grooming", label: "Brows & lashes", hint: "Shaping and framing" },
    ...focusTail,
  ],
  neutral: [
    ...focusBase,
    { id: "grooming", label: "Grooming", hint: "Brows, facial hair, upkeep" },
    ...focusTail,
  ],
};

const aestheticShared: Choice[] = [
  { id: "clean", label: "Clean" },
  { id: "model", label: "Model" },
  { id: "athletic", label: "Athletic" },
  { id: "professional", label: "Professional" },
  { id: "streetwear", label: "Streetwear" },
  { id: "old-money", label: "Old money" },
  { id: "custom", label: "Something else" },
];

export const AESTHETIC_CHOICES: ChoiceSet = {
  male: [
    aestheticShared[0],
    { id: "masculine", label: "Masculine" },
    ...aestheticShared.slice(1),
  ],
  female: [
    aestheticShared[0],
    { id: "feminine", label: "Feminine" },
    ...aestheticShared.slice(1),
  ],
  neutral: [
    aestheticShared[0],
    { id: "androgynous", label: "Androgynous" },
    ...aestheticShared.slice(1),
  ],
};

const concernHead: Choice[] = [
  { id: "hairstyle", label: "Hairstyle" },
  { id: "definition", label: "Facial definition" },
  { id: "skin", label: "Skin" },
];

const concernTail: Choice[] = [
  { id: "style", label: "Clothing & style" },
  { id: "overall", label: "Overall appearance" },
];

export const CONCERN_CHOICES: ChoiceSet = {
  male: [
    ...concernHead,
    { id: "facial-hair", label: "Facial hair" },
    { id: "brows", label: "Eyebrows" },
    ...concernTail,
  ],
  female: [
    ...concernHead,
    { id: "brows", label: "Brows & lashes" },
    { id: "hair-health", label: "Hair condition" },
    ...concernTail,
  ],
  neutral: [
    ...concernHead,
    { id: "brows", label: "Eyebrows" },
    { id: "facial-hair", label: "Facial hair" },
    ...concernTail,
  ],
};

export const HAIR_TYPE_CHOICES: Choice[] = [
  { id: "straight", label: "Straight" },
  { id: "wavy", label: "Wavy" },
  { id: "curly", label: "Curly" },
  { id: "coily", label: "Coily" },
];

export const HAIR_LENGTH_CHOICES: ChoiceSet = {
  male: [
    { id: "buzzed", label: "Buzzed" },
    { id: "short", label: "Short" },
    { id: "medium", label: "Medium" },
    { id: "long", label: "Long" },
  ],
  female: [
    { id: "pixie", label: "Pixie" },
    { id: "bob", label: "Chin to jaw" },
    { id: "shoulder", label: "Shoulder" },
    { id: "long", label: "Past shoulder" },
  ],
  neutral: [
    { id: "buzzed", label: "Buzzed" },
    { id: "short", label: "Short" },
    { id: "medium", label: "Medium" },
    { id: "long", label: "Long" },
  ],
};

export const SKIN_TYPE_CHOICES: Choice[] = [
  { id: "dry", label: "Dry" },
  { id: "oily", label: "Oily" },
  { id: "combination", label: "Combination" },
  { id: "normal", label: "Normal" },
  { id: "sensitive", label: "Sensitive" },
  { id: "unsure", label: "Not sure" },
];

/** Multi-select, capped — a list of eight concerns isn't a priority list. */
export const SKIN_CONCERN_CHOICES: Choice[] = [
  { id: "breakouts", label: "Breakouts" },
  { id: "texture", label: "Texture" },
  { id: "redness", label: "Redness" },
  { id: "dark-circles", label: "Dark circles" },
  { id: "dryness", label: "Dryness" },
  { id: "oiliness", label: "Shine" },
  { id: "dullness", label: "Dullness" },
  { id: "none", label: "Nothing in particular" },
];

export const MAX_SKIN_CONCERNS = 3;

export const DAILY_MINUTES_CHOICES: Choice[] = [
  { id: "under-5", label: "Under 5 min" },
  { id: "5-15", label: "5–15 min" },
  { id: "15-30", label: "15–30 min" },
  { id: "30-plus", label: "30 min+" },
];

export const COMMITMENT_CHOICES: Choice[] = [
  { id: "small", label: "Small improvements", hint: "Nothing anyone would comment on" },
  { id: "moderate", label: "Moderate changes", hint: "A noticeably different look" },
  { id: "anything", label: "I'm open to anything", hint: "Show me the full range" },
];

export const PRIORITY_CHOICES: Choice[] = [
  { id: "natural", label: "Look better naturally" },
  { id: "attractive", label: "Look more attractive" },
  { id: "confident", label: "Look more confident" },
  { id: "style", label: "Find my personal style" },
];

/** Labels shown back to the user on the profile screen. */
export function labelFor(list: Choice[], id: string | null): string {
  return list.find((c) => c.id === id)?.label ?? "Not set";
}
