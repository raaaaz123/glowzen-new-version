import "server-only";

import { Type } from "@google/genai";
import { DEFAULT_LOCALE, LOCALE_META, type Locale } from "@/lib/i18n/config";
import type { QuestionnaireAnswers } from "@/lib/types";

/**
 * The guardrails matter more than the format here. A vision model asked to
 * assess a face will produce cruel, confident output unless told not to.
 */
export const SYSTEM_INSTRUCTION = `
You help people find the small number of changes that would make the biggest
difference to how they present. You are looking at one photo the person chose to
upload of themselves.

WHAT YOU PRODUCE
- Three improvement opportunities, ranked by how much visible difference the
  change would make.
- Five area readings, and one overall "opportunity" figure meaning how much
  headroom is left — a HIGH number is a good thing, not a bad one.
- Three haircut shapes that suit this person's face, with what to tell a
  barber or stylist.
- When asked for it, makeup guidance: undertone, shades with approximate hex
  values, and two or three looks.
- When asked for it, a facial-hair reading: whether a beard suits this face at
  all, and the shapes to ask for if it does.

HARD RULES
- Never rate, score or comment on how attractive the person is. "Impact" is a
  property of the change, never of the person.
- Never say or imply that someone is unattractive, ugly, old, fat, thin, or
  that any feature is a flaw. Describe what a change would do, not what is
  wrong with them.
- Never comment on race, ethnicity, body weight, disability, or any feature a
  person cannot change. Do not guess or mention their ethnicity or nationality.
- Do not try to identify who the person is, or say they resemble anyone.
- No medical claims, diagnoses, or treatment advice. Skincare guidance stays
  general — cleansing, moisturising, sun protection — and says so.
- If the photo is not a clear, front-facing photo of one person's face, set
  usable to false and explain briefly what to retake. Do not guess.

THE THREE HAIRCUTS
- Match the cuts to the presentation the person told you about, never to the one
  you think you read off the photo. They chose it; the photo doesn't overrule it.
- Male: masculine cuts only — tapers, fades, crops, quiffs, side parts, scissor
  cuts. Never a bob, a lob, or long layers.
- Female: feminine cuts only — layers, bobs, lobs, shags, curtain-length
  fringes, pixies. Never a barber taper sold as a men's cut.
- Non-binary or not stated: shapes that read either way — soft undercut,
  textured crop, mid-length layers — and do not guess a presentation.
- Name real cuts a barber or stylist would recognise by that name, and stay
  inside the hair length they have now unless the blurb admits the grow-out.

LANGUAGE
- Write EVERY string you return in the language named in the request. That
  covers the summary, the area labels and notes, all three opportunities and
  their steps, the haircut names, the barber notes, the maintenance lines, the
  tags, and every word of the makeup and facial-hair readings. No field is
  exempt, and nothing is left in English because it "sounds better".
- Write it the way a person who grew up speaking it writes, not the way a
  translation of English reads. Use that language's own idiom for hair and
  grooming, and its own conventions for punctuation and quotation marks.
- Haircuts and beard shapes are the one place where a borrowed English term is
  often what a local barber actually recognises. When that is true, give the
  name the way it is said in that market — and if the English name is the one
  that would be understood at the chair, put it in brackets after the local
  name so the person can say either.
- Barber notes are read aloud in a chair in that country. Write them so that
  works: the language they speak, and the measurements they use — centimetres
  where centimetres are used, clipper guard numbers where those are standard.

HOW TO WRITE
- Plain, confident, encouraging. Sentence case where the language has one.
  Short sentences.
- Be specific about what you can actually see in this photo — "your hair sits
  wide at the sides", not "consider a new hairstyle". Specificity is the whole
  product.
- No jargon. Never write the local equivalent of "facial morphology", "golden
  ratio", "symmetry score", or "AI analysis determined".
- Respect the person's stated limits. If they said they want small changes,
  do not propose growing their hair out for a year.
- Work with the hair texture they told you they have. Do not recommend a cut
  that only holds on a different texture.
- If a cut needs more length than they have now, say how long the grow-out
  takes in the blurb. If they chose small changes, do not recommend it at all.
- Skincare must match the skin type and the concerns they named. Generic
  "cleanse and moisturise" is a wasted slot if they told you what's wrong.
- Nothing you recommend may take longer per day than the time they gave you.
- Barber notes must be something a person can read aloud at the chair.

THE PLAN
- Week 1 tasks must be doable this week. Booking a barber, buying one product,
  taking a starting photo. Nothing that needs a result first.
- Every task ties back to one of the three opportunities you ranked. Do not
  introduce a fourth project.
- Daily habits must fit inside the minutes they gave you, together, not each.
- Weeks 5-8 compound what weeks 1-4 started — no new commitments, and this is
  where slower changes (grow-out, skin turnover) actually show.
- Milestones say what they should SEE by that day, not what to do.

FACIAL HAIR, WHEN ASKED FOR
- Read the growth that is actually in this photo: how dense it is, how far up
  the cheek it reaches, whether the moustache connects to the chin, where it
  thins out. Recommend only what this person can currently grow.
- A clean shave is a real answer, not a consolation prize. When the face is
  better clean-shaven — thin or uneven growth, a shape that hides a good jaw —
  set verdict to clean-shaven and say so plainly and warmly.
- When a beard does suit, set verdict to beard and give three shapes, strongest
  match first, each naming where the cheek line and the neckline sit.
- Never describe their growth as patchy, sparse, thin or weak back at them.
  Talk about what a shape does, not about what their face lacks.
- Beard notes must be readable aloud at the chair: lengths, guard numbers and
  where the lines go.
- The person's hair is a separate recommendation. Do not restyle it here.

MAKEUP, WHEN ASKED FOR
- Read undertone from the skin in shadow, not the lit side. Warm, cool, neutral
  or olive. If the lighting makes it genuinely unreadable, say neutral rather
  than guessing.
- Hex values are a starting point for a person standing at a counter, not a
  colour match. Keep them plausible for this person's depth.
- Recommend product TYPES and what to look for, never specific brand names or
  product shade codes. You cannot verify those and a wrong one wastes money.
- Include at least one low-effort look under six minutes. Most people will not
  do a fifteen-minute routine on a Tuesday.
- Say what to avoid and why, in terms of undertone, not of their face.
`.trim();

const opportunity = {
  type: Type.OBJECT,
  required: [
    "area",
    "title",
    "impact",
    "headline",
    "description",
    "recommendation",
    "why",
    "steps",
  ],
  properties: {
    area: { type: Type.STRING, enum: ["hair", "grooming", "skin", "style", "face"] },
    title: { type: Type.STRING, description: "Two or three words, e.g. Hairstyle" },
    impact: { type: Type.INTEGER, description: "0-100, how much difference this change makes" },
    headline: { type: Type.STRING, description: "Six words or fewer, e.g. Highest potential improvement" },
    description: { type: Type.STRING, description: "Two sentences on what you see and what it does" },
    recommendation: { type: Type.STRING, description: "One sentence, the actual change to make" },
    why: { type: Type.STRING, description: "One or two sentences on why it works for this face" },
    steps: {
      type: Type.ARRAY,
      minItems: "3",
      maxItems: "3",
      items: { type: Type.STRING, description: "A concrete action, under 12 words" },
    },
  },
};

const hairstyle = {
  type: Type.OBJECT,
  required: ["name", "match", "blurb", "why", "barberNotes", "maintenance", "tags"],
  properties: {
    name: { type: Type.STRING, description: "The cut's real name, as a barber or stylist would say it" },
    match: { type: Type.INTEGER, description: "0-100, how well it suits this face" },
    blurb: { type: Type.STRING, description: "One short line, including the upkeep cost" },
    why: { type: Type.STRING, description: "One or two sentences on why it suits this face" },
    barberNotes: { type: Type.STRING, description: "Read aloud at the chair. Lengths and guard numbers." },
    maintenance: { type: Type.STRING, description: "e.g. Trim every 3-4 weeks." },
    tags: { type: Type.ARRAY, minItems: "1", maxItems: "2", items: { type: Type.STRING } },
  },
};

const shade = {
  type: Type.OBJECT,
  required: ["name", "hex", "note"],
  properties: {
    name: { type: Type.STRING, description: "Plain colour name, e.g. Warm rose" },
    hex: { type: Type.STRING, description: "#RRGGBB, approximate" },
    note: { type: Type.STRING, description: "Under 10 words on where or how to use it" },
  },
};

const makeupLook = {
  type: Type.OBJECT,
  required: ["name", "match", "minutes", "blurb", "why", "steps", "shades", "products"],
  properties: {
    name: { type: Type.STRING },
    match: { type: Type.INTEGER, description: "0-100" },
    minutes: { type: Type.INTEGER, description: "Realistic minutes to do it" },
    blurb: { type: Type.STRING, description: "One short line" },
    why: { type: Type.STRING, description: "One or two sentences, specific to this face" },
    steps: { type: Type.ARRAY, minItems: "3", maxItems: "5", items: { type: Type.STRING } },
    shades: { type: Type.ARRAY, minItems: "2", maxItems: "3", items: shade },
    products: {
      type: Type.ARRAY,
      minItems: "2",
      maxItems: "4",
      items: {
        type: Type.OBJECT,
        required: ["type", "lookFor"],
        properties: {
          type: { type: Type.STRING, description: "Product category, no brand names" },
          lookFor: { type: Type.STRING, description: "Shade and finish to ask for" },
        },
      },
    },
  },
};

const MAKEUP_SCHEMA = {
  type: Type.OBJECT,
  required: ["undertone", "depth", "summary", "base", "cheek", "lip", "eye", "avoid", "looks"],
  properties: {
    undertone: { type: Type.STRING, enum: ["warm", "cool", "neutral", "olive"] },
    depth: { type: Type.STRING, description: "Plain language, e.g. Light to medium" },
    season: { type: Type.STRING, description: "Colour season, only if readable" },
    summary: { type: Type.STRING, description: "One or two sentences on what suits them" },
    base: { type: Type.ARRAY, minItems: "1", maxItems: "2", items: shade },
    cheek: { type: Type.ARRAY, minItems: "1", maxItems: "2", items: shade },
    lip: { type: Type.ARRAY, minItems: "2", maxItems: "3", items: shade },
    eye: { type: Type.ARRAY, minItems: "2", maxItems: "3", items: shade },
    avoid: {
      type: Type.ARRAY,
      minItems: "2",
      maxItems: "3",
      items: {
        type: Type.OBJECT,
        required: ["label", "reason"],
        properties: {
          label: { type: Type.STRING },
          reason: { type: Type.STRING, description: "About undertone, not about their face" },
        },
      },
    },
    looks: { type: Type.ARRAY, minItems: "2", maxItems: "3", items: makeupLook },
  },
};

const planWeek = {
  type: Type.OBJECT,
  required: ["week", "title", "focus", "tasks"],
  properties: {
    week: { type: Type.INTEGER, description: "1-8" },
    title: { type: Type.STRING, description: "Three or four words, e.g. Book the cut" },
    focus: { type: Type.STRING, description: "One short line on what this week is for" },
    tasks: {
      type: Type.ARRAY,
      minItems: "2",
      maxItems: "4",
      items: { type: Type.STRING, description: "One concrete action, under 12 words" },
    },
  },
};

export const PLAN_SCHEMA = {
  type: Type.OBJECT,
  required: ["title", "subtitle", "weeks", "habits", "milestones"],
  properties: {
    title: { type: Type.STRING, description: "e.g. Your 30-day glow-up plan" },
    subtitle: { type: Type.STRING, description: "One line naming the three things it works on" },
    weeks: { type: Type.ARRAY, minItems: "8", maxItems: "8", items: planWeek },
    habits: {
      type: Type.ARRAY,
      minItems: "3",
      maxItems: "6",
      items: {
        type: Type.OBJECT,
        required: ["label", "when", "detail"],
        properties: {
          label: { type: Type.STRING, description: "Under 5 words, e.g. SPF" },
          when: { type: Type.STRING, enum: ["am", "pm", "weekly"] },
          detail: { type: Type.STRING, description: "Under 12 words on how to do it" },
        },
      },
    },
    milestones: {
      type: Type.ARRAY,
      minItems: "4",
      maxItems: "4",
      items: {
        type: Type.OBJECT,
        required: ["day", "label", "body"],
        properties: {
          day: { type: Type.INTEGER, description: "7, 14, 30 and 60" },
          label: { type: Type.STRING, description: "Under 5 words" },
          body: { type: Type.STRING, description: "One sentence on what they should SEE by then" },
        },
      },
    },
  },
};

const beardStyle = {
  type: Type.OBJECT,
  required: ["name", "match", "blurb", "why", "barberNotes", "maintenance", "tags"],
  properties: {
    name: { type: Type.STRING, description: "The shape's real name, e.g. Short boxed beard" },
    match: { type: Type.INTEGER, description: "0-100, how well it suits this face" },
    blurb: { type: Type.STRING, description: "One short line, including the upkeep cost" },
    why: { type: Type.STRING, description: "One or two sentences on why it suits this face" },
    barberNotes: {
      type: Type.STRING,
      description: "Read aloud at the chair. Lengths, guards, cheek line and neckline.",
    },
    maintenance: { type: Type.STRING, description: "e.g. Line up every 2 weeks." },
    tags: { type: Type.ARRAY, minItems: "1", maxItems: "2", items: { type: Type.STRING } },
  },
};

const BEARD_SCHEMA = {
  type: Type.OBJECT,
  required: ["verdict", "growth", "summary", "recommendation", "styles"],
  properties: {
    verdict: { type: Type.STRING, enum: ["beard", "clean-shaven"] },
    growth: {
      type: Type.STRING,
      description: "One line on the growth visible in this photo, said kindly",
    },
    summary: { type: Type.STRING, description: "One or two sentences on what suits this jaw" },
    recommendation: { type: Type.STRING, description: "One sentence, the actual thing to do" },
    styles: {
      type: Type.ARRAY,
      description: "Three shapes when a beard suits. Exactly one — the clean shave — when it doesn't.",
      minItems: "1",
      maxItems: "3",
      items: beardStyle,
    },
  },
};

/**
 * Built per request rather than fixed: makeup and facial hair are never both
 * wanted, and the API rejects an over-complex schema outright, so the branch
 * that isn't being asked for is left out of the shape entirely.
 */
export function buildAnalysisSchema(opts: { wantsMakeup: boolean; wantsBeard: boolean }) {
  return {
  type: Type.OBJECT,
  required: ["usable", "overall", "summary", "scores", "opportunities", "hairstyles"],
  properties: {
    usable: { type: Type.BOOLEAN },
    issue: { type: Type.STRING, description: "Only when usable is false: what to retake, one sentence" },
    overall: { type: Type.INTEGER, description: "0-100 headroom. High is good." },
    summary: { type: Type.STRING, description: "One or two sentences framing where their headroom is" },
    scores: {
      type: Type.ARRAY,
      minItems: "5",
      maxItems: "5",
      items: {
        type: Type.OBJECT,
        required: ["key", "label", "value", "note"],
        properties: {
          key: { type: Type.STRING, enum: ["face", "hair", "grooming", "skin", "style"] },
          label: { type: Type.STRING },
          value: { type: Type.INTEGER },
          note: { type: Type.STRING, description: "Six words or fewer" },
        },
      },
    },
    opportunities: { type: Type.ARRAY, minItems: "3", maxItems: "3", items: opportunity },
    hairstyles: { type: Type.ARRAY, minItems: "3", maxItems: "3", items: hairstyle },
    ...(opts.wantsMakeup ? { makeup: MAKEUP_SCHEMA } : {}),
    ...(opts.wantsBeard ? { beard: BEARD_SCHEMA } : {}),
  },
  };
}

const label = (v: string | null | undefined, fallback: string) => v || fallback;

const list = (v: string[] | undefined, fallback: string) =>
  v && v.length ? v.join(", ") : fallback;

/**
 * "Presents as: female" on its own reads as background, and the model will
 * happily follow it with a barber taper. The haircut constraint has to be said
 * as an instruction, in the same breath as the other limits.
 */
function haircutBrief(gender: string | null | undefined) {
  if (gender === "male") {
    return "They present as male — all three cuts must be masculine ones.";
  }
  if (gender === "female") {
    return "They present as female — all three cuts must be feminine ones.";
  }
  return (
    "They chose non-binary or didn't say — pick shapes that read either way, " +
    "and do not infer a presentation from the photo."
  );
}

/**
 * The language line.
 *
 * Stated twice on purpose — once at the top, where it sets the frame for
 * everything that follows, and once at the bottom, next to the output
 * instructions, because a long prompt in English is itself a pull back towards
 * English and the last instruction is the one that sticks.
 */
function languageLine(locale: Locale) {
  return `Write every string you return in ${LOCALE_META[locale].aiName}.`;
}

/** Turns the questionnaire into the constraints the model has to respect. */
export function buildPrompt(
  answers: Partial<QuestionnaireAnswers>,
  wantsMakeup: boolean,
  wantsBeard: boolean,
  locale: Locale = DEFAULT_LOCALE,
) {
  return [
    languageLine(locale),
    "",
    "Here is the person's photo and what they told us.",
    "",
    `Presents as: ${label(answers.gender, "not stated")}`,
    `Age: ${answers.age ? `${answers.age}` : "not stated"}`,
    `Wants to improve: ${label(answers.focus, "everything")}`,
    `Target aesthetic: ${label(answers.aesthetic, "not stated")}`,
    `What bothers them most: ${label(answers.concern, "not stated")}`,
    `Hair texture: ${label(answers.hairType, "not stated")}`,
    `Hair length now: ${label(answers.hairLength, "not stated")}`,
    `Skin type: ${label(answers.skinType, "not stated")}`,
    `Skin concerns: ${list(answers.skinConcerns, "none given")}`,
    `How much they'll change: ${label(answers.commitment, "moderate")}`,
    `Time per day they'll spend: ${label(answers.dailyMinutes, "not stated")}`,
    `What matters most to them: ${label(answers.priority, "look better naturally")}`,
    "",
    "Rank the three opportunities so the highest-impact one is first. Order the",
    "haircuts so the strongest match is first. Keep every recommendation inside",
    "the change level, hair texture and daily time they gave you, and point it",
    "at the aesthetic they named. Address the skin concerns they listed by name.",
    "",
    haircutBrief(answers.gender),
    "",
    wantsMakeup
      ? "Also fill in makeup: undertone, shades and two or three looks."
      : "Leave makeup out entirely.",
    "",
    languageLine(locale),
    "",
    wantsBeard
      ? [
          "Also fill in the facial-hair reading. Decide first whether a beard",
          "actually suits this face and this growth. If a clean shave is the",
          "better look, set verdict to clean-shaven and return exactly one",
          "style — the clean shave itself — so they can still see it on their",
          "own face. Otherwise set verdict to beard and return three shapes,",
          "strongest match first.",
        ].join(" ")
      : "Leave facial hair out entirely.",
  ].join("\n");
}


/**
 * The plan is a second call. Analysis + plan + makeup in one schema is rejected
 * by the API as too complex, and splitting it also lets the report land before
 * the plan is written.
 */
export const PLAN_SYSTEM_INSTRUCTION = `
You turn an appearance analysis into an eight-week plan the person will actually
finish. You are given the three changes that were ranked highest for them and
the limits they set on their own time and effort.

RULES
- Every task ties back to one of the three opportunities. Do not introduce a
  fourth project.
- Week 1 must be doable this week: booking an appointment, buying one product,
  taking a starting photo. Nothing that needs a result first.
- Daily habits must fit inside the minutes they gave you — all of them together,
  not each.
- Weeks 5-8 compound weeks 1-4. No new commitments; this is where slower
  changes like grow-out and skin turnover actually show.
- Milestones say what they should SEE by that day, not what to do.
- No medical claims. Skincare stays general.
- Plain, encouraging language. Sentence case where the language has one. Tasks
  short enough to scan — around a dozen words in English, and the equivalent
  length in any other language.

LANGUAGE
- Write EVERY string in the language named in the request: the title, the
  subtitle, all eight week titles and focus lines, every task, every habit
  label and detail, and all four milestones. Nothing stays in English.
- Write it as a native speaker would, not as a translation. Use that market's
  own units and conventions.
`.trim();

export function buildPlanPrompt(input: {
  answers: Partial<QuestionnaireAnswers>;
  summary: string;
  opportunities: { title: string; recommendation: string; steps: string[] }[];
  topHairstyle?: { name: string; maintenance: string };
  locale?: Locale;
}) {
  const { answers, summary, opportunities, topHairstyle, locale = DEFAULT_LOCALE } = input;
  return [
    languageLine(locale),
    "",
    // The analysis it is building on was itself written in this language, so
    // the summary and the three changes below are already in it.
    "Here is what the analysis found, and what they told us about themselves.",
    "",
    `Summary: ${summary}`,
    "",
    "The three changes, highest impact first:",
    ...opportunities.map(
      (o, i) => `${i + 1}. ${o.title} — ${o.recommendation} (${o.steps.join("; ")})`,
    ),
    "",
    topHairstyle ? `Matched cut: ${topHairstyle.name}. ${topHairstyle.maintenance}` : "",
    "",
    `Presents as: ${label(answers.gender, "not stated")}`,
    `How much they'll change: ${label(answers.commitment, "moderate")}`,
    `Time per day they'll spend: ${label(answers.dailyMinutes, "not stated")}`,
    `Hair texture: ${label(answers.hairType, "not stated")}`,
    `Hair length now: ${label(answers.hairLength, "not stated")}`,
    `Skin type: ${label(answers.skinType, "not stated")}`,
    `Skin concerns: ${list(answers.skinConcerns, "none given")}`,
    "",
    languageLine(locale),
    "",
    "Write the eight weeks, the daily habits, and milestones for days 7, 14, 30 and 60.",
  ]
    .filter(Boolean)
    .join("\n");
}
