import type { Gender } from "@/lib/types";

/**
 * Who you'd take the notes to. A language rule, not a recommendation — men's
 * cuts are done at a barber, and "stylist" covers everyone else.
 */
export function stylistWord(gender: Gender | null) {
  return gender === "male" ? "barber" : "stylist";
}
