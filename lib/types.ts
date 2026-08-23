/** Shared data contracts. Every service returns these shapes, mock or real. */

export type Gender = "male" | "female" | "neutral";

export type FocusArea =
  | "full"
  | "face"
  | "hair"
  | "grooming"
  | "skin"
  | "style";

/** A question option as the UI renders it, once the words have been resolved. */
export interface Choice {
  id: string;
  label: string;
  hint?: string;
}

/**
 * A question option as it is *defined*: a stable id and a dictionary key. The
 * words come from whichever language the reader chose, so they cannot live
 * here.
 */
export interface ChoiceDef {
  /** Stored on the user and sent to the model. Never translated. */
  id: string;
  /** Key under `choices.<category>` in the dictionaries. */
  key: string;
  /** True when this option's entry is `{ label, hint }` rather than a string. */
  hint?: boolean;
}

export interface QuestionnaireAnswers {
  gender: Gender | null;
  /** Exact age in years, not a bucket. Null until they set it. */
  age: number | null;
  focus: string | null;
  aesthetic: string | null;
  concern: string | null;
  /** Texture. A photo shows it, but not what it does when it grows out. */
  hairType: string | null;
  hairLength: string | null;
  /** Not readable from a photo, and it changes every skincare recommendation. */
  skinType: string | null;
  skinConcerns: string[];
  commitment: string | null;
  /** Minutes a day they'll actually spend. Caps what we're allowed to suggest. */
  dailyMinutes: string | null;
  priority: string | null;
}

/**
 * Only what the user told us. Every field is nullable because we never invent
 * a name, an age or a goal on their behalf.
 */
export interface UserProfile {
  gender: Gender | null;
  age: number | null;
  aesthetic: string | null;
  goal: string | null;
  concern: string | null;
  /** R2 key for their photo, if they've uploaded one. */
  photoKey: string | null;
}

export interface AreaScore {
  key: string;
  label: string;
  value: number;
  note: string;
}

export type OpportunityArea = "hair" | "grooming" | "skin" | "style" | "face";

export interface Opportunity {
  id: string;
  area: OpportunityArea;
  /** Display name, e.g. "Hairstyle". */
  title: string;
  /** 0–100. Presented as "impact", never as a rating of the person. */
  impact: number;
  headline: string;
  description: string;
  recommendation: string;
  why: string;
  steps: string[];
  disclaimer?: string;
  image: string;
  /** Tailwind object-position, so each card crops to the area it discusses. */
  imagePosition?: string;
}

export interface Analysis {
  id: string;
  createdAt: string;
  gender: Gender;
  /** Always "ai" — every analysis is a reading of the user's own photo. */
  source: "ai";
  /** "Improvement opportunity" — headroom, not a rating. */
  overall: number;
  summary: string;
  /**
   * Signed read URL as it was at the time of the analysis. These expire, so
   * anything showing an older analysis re-signs from `photoKey` instead.
   */
  photo: string;
  /** R2 key for the selfie this was read from. Absent on very early scans. */
  photoKey?: string | null;
  scores: AreaScore[];
  opportunities: Opportunity[];
  /** Cuts matched in the same pass as the analysis. */
  hairstyles?: Hairstyle[];
  /** Facial-hair reading. Absent unless the profile asked for one. */
  beard?: BeardProfile;
  /** Shade and look guidance. Absent when makeup wasn't part of the read. */
  makeup?: MakeupProfile;
  /** The eight-week plan built from this analysis's own opportunities. */
  plan?: PlanTemplate;
}

/**
 * The plan as the model returns it — no completion state, no dates. Those are
 * per-user and get layered on when the plan is read back.
 */
export interface PlanTemplate {
  title: string;
  subtitle: string;
  weeks: {
    week: number;
    phase: 1 | 2;
    title: string;
    focus: string;
    tasks: string[];
  }[];
  habits: { label: string; when: HabitWhen; detail: string }[];
  milestones: { day: number; label: string; body: string }[];
}

export interface Hairstyle {
  id: string;
  name: string;
  match: number;
  blurb: string;
  /** Rendered preview. Null when this style hasn't been generated for the user. */
  image: string | null;
  why: string;
  barberNotes: string;
  maintenance: string;
  tags: string[];
}

/* ------------------------------------------------------------ facial hair */

/** A clean shave is a real answer here, not the absence of one. */
export type BeardVerdict = "beard" | "clean-shaven";

export interface BeardStyle {
  id: string;
  name: string;
  match: number;
  blurb: string;
  /** Rendered preview. Null when this shape hasn't been generated yet. */
  image: string | null;
  why: string;
  /** Read aloud at the chair: lengths, guards, where the lines sit. */
  barberNotes: string;
  maintenance: string;
  tags: string[];
}

export interface BeardProfile {
  verdict: BeardVerdict;
  /** What the growth in the photo can actually support. */
  growth: string;
  summary: string;
  recommendation: string;
  /**
   * Three shapes when a beard suits, one — the clean shave — when it doesn't.
   * Either way the user can render it on their own face.
   */
  styles: BeardStyle[];
}

export interface TransformationResult {
  styleId: string;
  /** Null when no preview exists for this style yet. */
  after: string | null;
  caption: string;
}

export interface PlanTask {
  id: string;
  label: string;
  done: boolean;
}

export interface PlanWeek {
  week: number;
  /** 1 = first 30 days, 2 = the compounding half. */
  phase: 1 | 2;
  title: string;
  focus: string;
  state: "done" | "active" | "upcoming";
  tasks: PlanTask[];
}

export interface GlowPlan {
  id: string;
  title: string;
  subtitle: string;
  startedLabel: string;
  weeks: PlanWeek[];
  habits: RoutineHabit[];
  checkIns: CheckIn[];
  milestones: Milestone[];
}

export interface ProgressMetric {
  key: string;
  label: string;
  from: number;
  to: number;
}

export interface ProgressSnapshot {
  id: string;
  dayLabel: string;
  dateLabel: string;
  photo: string;
  /** Smaller variant for list rows and avatars. */
  thumb?: string;
}

export interface ProgressReport {
  completion: number;
  headline: string;
  metrics: ProgressMetric[];
  before: ProgressSnapshot;
  after: ProgressSnapshot;
  timeline: { label: string; date: string; note: string; done: boolean }[];
}

export interface PastScan {
  id: string;
  label: string;
  dateLabel: string;
  overall: number;
  /** Freshly signed at read time. Empty when the photo is no longer readable. */
  photo: string;
  topArea: string;
}

/* ------------------------------------------------------------------ makeup */

export interface Shade {
  name: string;
  /** Approximate colour, for the swatch. Screen colour is a guide, not a match. */
  hex: string;
  note: string;
}

export interface MakeupProduct {
  type: string;
  lookFor: string;
}

export interface MakeupLook {
  id: string;
  name: string;
  match: number;
  blurb: string;
  why: string;
  steps: string[];
  shades: Shade[];
  products: MakeupProduct[];
  /** Rendered on the user's own photo. Null until a preview exists. */
  image: string | null;
  minutes: number;
}

export type Undertone = "warm" | "cool" | "neutral" | "olive";

export interface MakeupProfile {
  undertone: Undertone;
  /** Plain-language depth, e.g. "Light to medium". */
  depth: string;
  /** Colour season, when it can be read confidently. */
  season?: string;
  summary: string;
  base: Shade[];
  cheek: Shade[];
  lip: Shade[];
  eye: Shade[];
  avoid: { label: string; reason: string }[];
  looks: MakeupLook[];
}

/* --------------------------------------------------------------- retention */

export type HabitWhen = "am" | "pm" | "weekly";

export interface RoutineHabit {
  id: string;
  label: string;
  when: HabitWhen;
  detail: string;
}

export interface CheckIn {
  week: number;
  label: string;
  /** Photo key once taken. */
  photoKey: string | null;
  photo: string | null;
  dateLabel: string;
  state: "done" | "due" | "upcoming";
}

export interface Milestone {
  day: number;
  label: string;
  body: string;
  state: "done" | "next" | "locked";
}
