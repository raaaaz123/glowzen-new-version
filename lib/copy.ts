import type { Gender } from "@/lib/types";
import type { Vars } from "@/lib/i18n/translate";
import { st } from "@/lib/i18n/runtime";

type Translate = (path: string, vars?: Vars) => string;

/**
 * Who you'd take the notes to. A language rule, not a recommendation — men's
 * cuts are done at a barber, and "stylist" covers everyone else.
 *
 * Which of the two words a language even has is the translator's call: several
 * draw the line differently, and a couple use one word for both. The dictionary
 * decides; this only picks the branch.
 */
export function stylistWord(t: Translate, gender: Gender | null) {
  return t(gender === "male" ? "common.stylistWord.male" : "common.stylistWord.other");
}

/** The same, for code with no component to hook `useT` from. */
export function stylistWordRuntime(gender: Gender | null) {
  return st(gender === "male" ? "common.stylistWord.male" : "common.stylistWord.other");
}
