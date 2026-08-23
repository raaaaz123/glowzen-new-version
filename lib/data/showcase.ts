import type { Gender } from "@/lib/types";

/**
 * Illustrative assets only — the labelled before/after on the landing page and
 * the photo-quality examples on the upload screen. Nothing here is ever
 * presented as the user's own data, and no screen falls back to it.
 */

export const SHOWCASE = [
  {
    id: "male" as const,
    labelKey: "welcome.exampleMen",
    before: "/img/photo-male-before.jpg",
    after: "/img/photo-male-after.jpg",
    captionKey: "welcome.exampleMenCaption",
  },
  {
    id: "female" as const,
    labelKey: "welcome.exampleWomen",
    before: "/img/photo-female-before.jpg",
    after: "/img/photo-female-after.jpg",
    captionKey: "welcome.exampleWomenCaption",
  },
];

/** Both examples show the same gender, so the contrast reads as lighting. */
const GUIDES = {
  male: { good: "/img/photo-male-after-sm.jpg", bad: "/img/photo-male-before-sm.jpg" },
  female: { good: "/img/photo-female-after-sm.jpg", bad: "/img/photo-female-before-sm.jpg" },
  neutral: { good: "/img/hero-neutral.svg", bad: "/img/neutral-current.svg" },
} as const;

export function photoGuide(gender: Gender | null) {
  return GUIDES[gender ?? "neutral"];
}
