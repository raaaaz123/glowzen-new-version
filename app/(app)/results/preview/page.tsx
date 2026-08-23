"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Crown,
  Image as ImageIcon,
  Lock,
  Palette,
  ScanFace,
  Scissors,
  ShieldCheck,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ImpactMeter, ProgressRing } from "@/components/ui/ProgressRing";
import { Paywall, PRICE, RATING, REVIEWS } from "@/components/app/Paywall";
import { useGlow } from "@/lib/state/GlowContext";
import { useI18n } from "@/lib/i18n/I18nContext";
import { cn } from "@/lib/utils";
import {
  AESTHETIC_CHOICES,
  CONCERN_CHOICES,
  FOCUS_CHOICES,
  HAIR_TYPE_CHOICES,
  labelFor,
} from "@/lib/data/questions";
import type { Vars } from "@/lib/i18n/translate";

type T = (path: string, vars?: Vars) => string;

const IMPROVEMENT_COUNT = 3;
const UNLOCKED_TODAY = 12847;
/** How many measurements the read is described as taking. Copy, not a claim. */
const RATIOS = 68;
const SLIDE_MS = 4600;

const BENEFIT_KEYS = [
  "paywall.benefits.analysis",
  "paywall.benefits.hair",
  "paywall.benefits.beardMakeup",
  "paywall.benefits.plan",
  "paywall.benefits.previews",
  "paywall.benefits.rescans",
];

/**
 * Splits a translated template on its `{x}` slot so one half can be
 * highlighted. Doing it this way rather than concatenating two strings keeps
 * word order in the translator's hands — "Verdict: X" is not "X: Verdict"
 * everywhere, and Japanese puts the slot in the middle.
 */
function highlight(template: string, node: ReactNode): ReactNode {
  const [before, after = ""] = template.split("{x}");
  return (
    <Fragment>
      {before}
      {node}
      {after}
    </Fragment>
  );
}

/* ────────────────────────────────────────────── locked values ─── */

/**
 * A value the reader hasn't paid for. The shape stays — a name is a name, a
 * number is two digits, a sentence is two lines — so the card reads as a real
 * result with the answers taken out, rather than as an empty grey box. Behind
 * it the numbers are demo data, so it is also the layer that keeps invented
 * figures from ever being presented as a finished reading.
 */
function Locked({
  children,
  px = 6,
  block,
  className,
}: {
  children: ReactNode;
  px?: number;
  /** Full-width wrapper. A meter inside a shrink-to-fit span has no width. */
  block?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "select-none",
        block ? "block w-full" : "inline-block max-w-full",
        className,
      )}
      style={{ filter: `blur(${px}px)` }}
    >
      {children}
    </span>
  );
}

/* ────────────────────────────────────────────── illustrations ─── */

type GlyphKind =
  | "fringe"
  | "quiff"
  | "crop"
  | "layers"
  | "bob"
  | "curls"
  | "stubble"
  | "boxed"
  | "clean"
  | "face";

/**
 * The hair and beard shapes, drawn rather than photographed. A photograph of
 * someone else's haircut on a card headed "matched to you" reads as a promise
 * we can't keep; a silhouette says "this is the shape" and nothing more. They
 * also scale to 40px and follow the accent colour, which no photo does.
 */
const SHAPES: Record<GlyphKind, ReactNode> = {
  fringe: (
    <path d="M13 21c0-7 4.7-11 11-11s11 4 11 11c-1.7-3.4-4-5-6.6-4.2-2.2.7-3 2.2-3.9 2.2-1 0-1.8-1.6-4-2.3C18.4 16 15 17 13 21Z" />
  ),
  quiff: (
    <path d="M13 22c.4-5.6 3-8.6 6.4-9.6-.5-2 .3-3.6 2.3-4.4-.4 2.4 1 3.4 3.3 3.6C30 12 34.7 15.4 35 22c-1.8-3.8-4.6-5.8-8.6-6-4.6-.2-9.4.6-13.4 6Z" />
  ),
  crop: (
    <path d="M13.4 21.6c0-7 4.6-11.2 10.6-11.2s10.6 4.2 10.6 11.2c-2-4.2-5-6-10.6-6s-8.6 1.8-10.6 6Z" />
  ),
  layers: (
    <path d="M12.6 21c0-7.2 5-11.4 11.4-11.4S35.4 13.8 35.4 21v13.6c-1.9-1.7-3-5-3.2-9.9-2.6 2.5-13 2.5-15.6 0-.2 4.9-1.3 8.2-3.2 9.9V21Z" />
  ),
  bob: (
    <path d="M13 21.4c0-7 5-11 11-11s11 4 11 11v6.2c-1.7-1.4-2.7-4-2.9-7.8-2.4 2.2-13.8 2.2-16.2 0-.2 3.8-1.2 6.4-2.9 7.8v-6.2Z" />
  ),
  curls: (
    <path d="M14 22c-2.6-1-2.6-4.6 0-5.6.2-3 3-5 5.7-4 1.8-2.4 5.6-2.4 7.4 0 2.8-1 5.6 1 5.8 4 2.6 1 2.6 4.6 0 5.6-2-4-5-5.8-9.4-5.8S16 18 14 22Z" />
  ),
  stubble: (
    <g>
      <circle cx="18.5" cy="29" r="1" />
      <circle cx="22" cy="31" r="1" />
      <circle cx="26" cy="31" r="1" />
      <circle cx="29.5" cy="29" r="1" />
      <circle cx="20" cy="33" r="1" />
      <circle cx="24" cy="34" r="1" />
      <circle cx="28" cy="33" r="1" />
    </g>
  ),
  boxed: (
    <path d="M16 25c0 6 3.6 10 8 10s8-4 8-10c-1.6 2.4-4.4 3.6-8 3.6S17.6 27.4 16 25Z" />
  ),
  clean: (
    <path
      d="M17 26c1 5 3.6 7.6 7 7.6s6-2.6 7-7.6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      opacity=".55"
    />
  ),
  face: null,
};

function Glyph({
  kind,
  className,
  tone = "accent",
  children,
}: {
  kind: GlyphKind;
  className?: string;
  tone?: "accent" | "quiet";
  children?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden",
        tone === "accent"
          ? "bg-champagne/10 text-champagne"
          : "bg-raised text-muted",
        className,
      )}
    >
      <svg viewBox="0 0 48 48" className="size-full p-1" fill="currentColor" aria-hidden>
        <path
          d="M9 46c1-7 6.6-10.6 15-10.6S38 39 39 46"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity=".3"
        />
        <ellipse
          cx="24"
          cy="23"
          rx="10.5"
          ry="12.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          opacity=".45"
        />
        {SHAPES[kind]}
        {children}
      </svg>
    </span>
  );
}

/**
 * The reader's own photo, cropped to whatever the card is talking about. It is
 * the one image on this screen that is genuinely theirs, so every slide that
 * can use it does — a stranger's face would say nothing about their result.
 */
function PhotoTile({
  photoUrl,
  position = "object-[center_25%]",
  className,
  fallback = "face",
  blur,
  zoom,
  overlay,
}: {
  photoUrl: string | null;
  position?: string;
  className?: string;
  fallback?: GlyphKind;
  blur?: number;
  /** Magnification around `position`, so a 44px tile reads as a crop. */
  zoom?: number;
  overlay?: ReactNode;
}) {
  if (!photoUrl) {
    return (
      <span className={cn("relative block shrink-0 overflow-hidden", className)}>
        <Glyph kind={fallback} className="size-full" tone="quiet" />
        {overlay}
      </span>
    );
  }
  return (
    <span className={cn("relative block shrink-0 overflow-hidden bg-raised", className)}>
      <img
        src={photoUrl}
        alt=""
        className={cn("size-full object-cover", position)}
        style={{
          filter: blur ? `blur(${blur}px)` : undefined,
          transform: blur || zoom ? `scale(${zoom ?? 1.08})` : undefined,
        }}
      />
      {overlay}
    </span>
  );
}

/**
 * What a style row actually holds once it is unlocked: the cut or the beard
 * rendered on the reader's own face, which is what /styles and /beard already
 * produce from their photo. Blurred here, with the lock on top, so the row
 * says "there is a picture of you behind this" and not "here is a stock model".
 * Falls back to the drawn shape when there is no photo to render on.
 */
function StyleThumb({
  photoUrl,
  position,
  zoom,
  fallback,
}: {
  photoUrl: string | null;
  position: string;
  zoom: number;
  fallback: GlyphKind;
}) {
  return (
    <PhotoTile
      photoUrl={photoUrl}
      position={position}
      zoom={zoom}
      blur={5}
      fallback={fallback}
      className="size-16 rounded-[1.1rem]"
      overlay={
        <span className="absolute inset-0 grid place-items-center bg-black/25">
          <Lock className="size-3.5 text-white drop-shadow" aria-hidden />
        </span>
      }
    />
  );
}

/* ────────────────────────────────────────────── demo slides ─── */

interface Slide {
  id: string;
  icon: typeof Star;
  title: string;
  short: string;
  subtitle: string;
  content: ReactNode;
}

/**
 * Static demo data behind the lock. It is never shown in the clear: every
 * figure sits inside <Locked>, so what sells the screen is the layout and the
 * reader's own photo, not a number we made up about their face.
 */
function useDemoSlides(isMale: boolean, photoUrl: string | null, t: T): Slide[] {
  return useMemo(
    () => [
      {
        id: "score",
        icon: TrendingUp,
        title: t("teaser.slides.score.title"),
        short: t("teaser.slides.score.short"),
        subtitle: t("teaser.slides.score.subtitle"),
        content: <ScoreSlide t={t} photoUrl={photoUrl} />,
      },
      {
        id: "hair",
        icon: Scissors,
        title: t("teaser.slides.hair.title"),
        short: t("teaser.slides.hair.short"),
        subtitle: t("teaser.slides.hair.subtitle", { count: 3 }),
        content: <HairSlide t={t} isMale={isMale} photoUrl={photoUrl} />,
      },
      isMale
        ? {
            id: "beard",
            icon: Scissors,
            title: t("teaser.slides.beard.title"),
            short: t("teaser.slides.beard.short"),
            subtitle: t("teaser.slides.beard.subtitle"),
            content: <BeardSlide t={t} photoUrl={photoUrl} />,
          }
        : {
            id: "makeup",
            icon: Palette,
            title: t("teaser.slides.makeup.title"),
            short: t("teaser.slides.makeup.short"),
            subtitle: t("teaser.slides.makeup.subtitle"),
            content: <MakeupSlide t={t} />,
          },
      {
        id: "areas",
        icon: Star,
        title: t("teaser.slides.areas.title"),
        short: t("teaser.slides.areas.short"),
        subtitle: t("teaser.slides.areas.subtitle"),
        content: <AreasSlide t={t} photoUrl={photoUrl} />,
      },
      {
        id: "plan",
        icon: Zap,
        title: t("teaser.slides.plan.title"),
        short: t("teaser.slides.plan.short"),
        subtitle: t("teaser.slides.plan.subtitle"),
        content: <PlanSlide t={t} photoUrl={photoUrl} />,
      },
    ],
    [isMale, photoUrl, t],
  );
}

/** Score ring, wrapped around the reader's own face. */
function ScoreSlide({ t, photoUrl }: { t: T; photoUrl: string | null }) {
  const areas = [
    { label: t("teaser.demo.areaHair"), value: 82 },
    { label: t("teaser.demo.areaSkin"), value: 65 },
    { label: t("teaser.demo.areaGrooming"), value: 71 },
  ];
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <ProgressRing value={73} size={132} stroke={8}>
          <PhotoTile
            photoUrl={photoUrl}
            className="size-[100px] rounded-full"
            fallback="crop"
          />
        </ProgressRing>
        <span className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-baseline gap-0.5 rounded-full bg-surface px-3 py-1 shadow-pop">
          <Locked px={5}>
            <span className="type-display text-[18px]">73</span>
          </Locked>
          <span className="text-[10px] text-faint">/100</span>
        </span>
      </div>

      <Locked px={4} className="mt-6 text-center" block>
        <p className="text-[13px] leading-relaxed text-muted">
          {t("teaser.demo.scoreBlurb")}
        </p>
      </Locked>

      <div className="mt-5 w-full space-y-3">
        {areas.map((s) => (
          <div key={s.label}>
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span className="font-medium">{s.label}</span>
              <Locked px={4}>
                <span className="font-mono text-[11px] text-faint">{s.value}</span>
              </Locked>
            </div>
            <Locked px={2} block>
              <ImpactMeter value={s.value} />
            </Locked>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Cut shapes, drawn. The names and match figures stay locked. */
function HairSlide({
  t,
  isMale,
  photoUrl,
}: {
  t: T;
  isMale: boolean;
  photoUrl: string | null;
}) {
  const cuts = [
    {
      name: t("teaser.demo.cut1"),
      match: 94,
      desc: t("teaser.demo.cut1Desc"),
      glyph: (isMale ? "fringe" : "layers") as GlyphKind,
      crop: "object-[center_18%]",
      zoom: 1.15,
    },
    {
      name: t("teaser.demo.cut2"),
      match: 88,
      desc: t("teaser.demo.cut2Desc"),
      glyph: (isMale ? "quiff" : "curls") as GlyphKind,
      crop: "object-[center_22%]",
      zoom: 1.25,
    },
    {
      name: t("teaser.demo.cut3"),
      match: 82,
      desc: t("teaser.demo.cut3Desc"),
      glyph: (isMale ? "crop" : "bob") as GlyphKind,
      crop: "object-[center_20%]",
      zoom: 1.1,
    },
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3 rounded-[1.4rem] bg-champagne/8 p-3">
        <PhotoTile
          photoUrl={photoUrl}
          className="size-11 rounded-[0.9rem]"
          position="object-[center_22%]"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted">{t("teaser.faceShape")}</p>
          <Locked px={5} className="mt-0.5" block>
            <p className="text-[14px] font-bold">{t("teaser.demo.faceShapeValue")}</p>
          </Locked>
        </div>
      </div>

      {cuts.map((c) => (
        <div
          key={c.name}
          className="flex items-center gap-3 rounded-[1.4rem] border border-line p-2.5"
        >
          <StyleThumb
            photoUrl={photoUrl}
            position={c.crop}
            zoom={c.zoom}
            fallback={c.glyph}
          />
          <div className="min-w-0 flex-1">
            <Locked px={5} block>
              <p className="text-[14px] font-bold">{c.name}</p>
            </Locked>
            <Locked px={4} className="mt-0.5" block>
              <p className="text-[12px] text-muted">{c.desc}</p>
            </Locked>
            <div className="mt-1.5 flex items-center gap-2">
              <Locked px={4}>
                <span className="font-mono text-[11px] text-champagne">
                  {t("common.matchPct", { value: c.match })}
                </span>
              </Locked>
              <Locked px={2} block className="flex-1">
                <ImpactMeter value={c.match} />
              </Locked>
            </div>
          </div>
        </div>
      ))}
      <p className="flex items-center gap-1.5 pt-0.5 text-[11.5px] text-muted">
        <ImageIcon className="size-3.5 shrink-0 text-champagne" aria-hidden />
        {t("paywall.benefits.previews")}
      </p>
    </div>
  );
}

/** Beard shapes, same treatment as the cuts. */
function BeardSlide({ t, photoUrl }: { t: T; photoUrl: string | null }) {
  const styles = [
    { name: t("teaser.demo.beard1"), match: 91, desc: t("teaser.demo.beard1Desc"), glyph: "stubble" as GlyphKind, crop: "object-[center_38%]", zoom: 1.3 },
    { name: t("teaser.demo.beard2"), match: 85, desc: t("teaser.demo.beard2Desc"), glyph: "boxed" as GlyphKind, crop: "object-[center_42%]", zoom: 1.2 },
    { name: t("teaser.demo.beard3"), match: 78, desc: t("teaser.demo.beard3Desc"), glyph: "clean" as GlyphKind, crop: "object-[center_36%]", zoom: 1.4 },
  ];
  return (
    <div className="space-y-2.5">
      <div className="rounded-[1.4rem] bg-champagne/8 p-3 text-center">
        <p className="text-[13px] font-medium">
          {highlight(
            t("teaser.demo.beardVerdict"),
            <Locked px={5}>
              <span className="text-champagne">{t("teaser.demo.beardVerdictValue")}</span>
            </Locked>,
          )}
        </p>
        <Locked px={4} className="mt-1" block>
          <p className="text-[12px] text-muted">{t("teaser.demo.beardVerdictNote")}</p>
        </Locked>
      </div>
      {styles.map((s) => (
        <div
          key={s.name}
          className="flex items-center gap-3 rounded-[1.4rem] border border-line p-2.5"
        >
          <StyleThumb
            photoUrl={photoUrl}
            position={s.crop}
            zoom={s.zoom}
            fallback={s.glyph}
          />
          <div className="min-w-0 flex-1">
            <Locked px={5} block>
              <p className="text-[14px] font-bold">{s.name}</p>
            </Locked>
            <Locked px={4} className="mt-0.5" block>
              <p className="text-[12px] text-muted">{s.desc}</p>
            </Locked>
            <Locked px={4} className="mt-1">
              <span className="font-mono text-[11px] text-champagne">
                {t("common.matchPct", { value: s.match })}
              </span>
            </Locked>
          </div>
        </div>
      ))}
      <p className="flex items-center gap-1.5 pt-0.5 text-[11.5px] text-muted">
        <ImageIcon className="size-3.5 shrink-0 text-champagne" aria-hidden />
        {t("paywall.benefits.previews")}
      </p>
    </div>
  );
}

/**
 * Colour map. The swatches themselves stay sharp: a palette is the one thing
 * on this screen that explains itself at a glance, and it is generic colour,
 * not a reading of anyone's face.
 */
function MakeupSlide({ t }: { t: T }) {
  const swatches = [
    { label: t("teaser.demo.swatchFoundation"), colors: ["#e8c9a0", "#d4a574", "#c49068"] },
    { label: t("teaser.demo.swatchLip"), colors: ["#c85c5c", "#d47a7a", "#b04848"] },
    { label: t("teaser.demo.swatchEye"), colors: ["#8b7355", "#a0845c", "#6b5840"] },
    { label: t("teaser.demo.swatchCheek"), colors: ["#d4917a", "#c98070", "#e0a090"] },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-[1.4rem] bg-champagne/8 p-3">
        <Glyph kind="face" className="size-14 rounded-[1.1rem]">
          {/* eyes, cheeks and lip, placed on the silhouette in the shades the
              palette below actually recommends */}
          <circle cx="19.5" cy="21" r="1.6" fill="#8b7355" />
          <circle cx="28.5" cy="21" r="1.6" fill="#8b7355" />
          <circle cx="17" cy="26" r="2.2" fill="#d4917a" opacity=".75" />
          <circle cx="31" cy="26" r="2.2" fill="#d4917a" opacity=".75" />
          <ellipse cx="24" cy="30.5" rx="3.2" ry="1.8" fill="#c85c5c" />
        </Glyph>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium">
            {highlight(
              t("teaser.demo.undertoneLine"),
              <Locked px={5}>
                <span className="text-champagne">{t("makeup.undertone.warm")}</span>
              </Locked>,
            )}
          </p>
          <Locked px={4} className="mt-1" block>
            <p className="text-[12px] text-muted">{t("teaser.demo.depthSeason")}</p>
          </Locked>
        </div>
      </div>

      {swatches.map((s) => (
        <div key={s.label} className="flex items-center gap-3">
          <span className="w-[5.5rem] shrink-0 text-[12.5px] text-muted">{s.label}</span>
          <div className="flex gap-2">
            {s.colors.map((hex) => (
              <span
                key={hex}
                className="size-8 rounded-full ring-1 ring-black/5"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
      ))}

      <Locked px={4} block>
        <p className="text-[12px] text-muted">{t("teaser.demo.looksNote", { count: 3 })}</p>
      </Locked>
    </div>
  );
}

/** Area scores, each next to the part of their photo it is about. */
function AreasSlide({ t, photoUrl }: { t: T; photoUrl: string | null }) {
  const areas = [
    { label: t("teaser.demo.area1"), value: 82, note: t("teaser.demo.area1Note"), crop: "object-[center_10%]" },
    { label: t("teaser.demo.area2"), value: 65, note: t("teaser.demo.area2Note"), crop: "object-[center_38%]" },
    { label: t("teaser.demo.area3"), value: 71, note: t("teaser.demo.area3Note"), crop: "object-[center_58%]" },
    { label: t("teaser.demo.area4"), value: 60, note: t("teaser.demo.area4Note"), crop: "object-[center_75%]" },
  ];
  return (
    <div className="space-y-3.5">
      {areas.map((a) => (
        <div key={a.label} className="flex items-center gap-3">
          <PhotoTile
            photoUrl={photoUrl}
            position={a.crop}
            zoom={1.5}
            className="size-11 rounded-[0.9rem]"
          />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-3 text-[13px]">
              <span className="font-medium">{a.label}</span>
              <Locked px={4}>
                <span className="font-mono text-[11px] text-faint">{a.value}</span>
              </Locked>
            </div>
            <Locked px={2} block>
              <ImpactMeter value={a.value} />
            </Locked>
            <Locked px={4} className="mt-1" block>
              <p className="text-[11.5px] text-faint">{a.note}</p>
            </Locked>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The plan as a strip of weeks. Week 0 is their photo as it is; the weeks
 * after it are the same photo behind a lock, which is the honest way to draw a
 * before/after we haven't rendered yet — and the reason to open it.
 */
function PlanSlide({ t, photoUrl }: { t: T; photoUrl: string | null }) {
  const weeks = [
    { week: 1, title: t("teaser.demo.week1"), tasks: [t("teaser.demo.week1a"), t("teaser.demo.week1b")] },
    { week: 4, title: t("teaser.demo.week4"), tasks: [t("teaser.demo.week4a"), t("teaser.demo.week4b")] },
    { week: 8, title: t("teaser.demo.week8"), tasks: [t("teaser.demo.week8a"), t("teaser.demo.week8b")] },
  ];
  const strip = [
    { key: "now", label: t("common.now"), blur: 0 },
    { key: "w2", label: t("common.week", { week: 2 }), blur: 5 },
    { key: "w4", label: t("common.week", { week: 4 }), blur: 8 },
    { key: "w8", label: t("common.week", { week: 8 }), blur: 11 },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1.5">
        {strip.map((s) => (
          <div key={s.key}>
            <PhotoTile
              photoUrl={photoUrl}
              className="block aspect-square w-full rounded-[1.1rem]"
              position="object-[center_25%]"
              blur={s.blur || undefined}
              overlay={
                s.blur ? (
                  <span className="absolute inset-0 grid place-items-center bg-black/25">
                    <Lock className="size-4 text-white drop-shadow" aria-hidden />
                  </span>
                ) : undefined
              }
            />
            <p
              className={cn(
                "mt-1.5 text-center text-[10.5px]",
                s.blur ? "text-faint" : "font-bold text-champagne",
              )}
            >
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {weeks.map((w) => (
        <div key={w.week} className="flex gap-3 rounded-[1.4rem] border border-line p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-[0.9rem] bg-champagne/12">
            <span className="text-[11px] font-bold text-champagne">
              {t("teaser.demo.weekBadge", { n: w.week })}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <Locked px={5} block>
              <p className="text-[13.5px] font-bold">{w.title}</p>
            </Locked>
            <Locked px={4} block className="mt-1">
              <ul className="space-y-0.5">
                {w.tasks.map((task) => (
                  <li key={task} className="text-[12px] text-muted">
                    • {task}
                  </li>
                ))}
              </ul>
            </Locked>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────── page pieces ─── */

/**
 * The one thing on the screen that is unarguably theirs: their photo, read.
 * It runs before the locked cards on purpose — proof first, price after.
 */
function ProofCard({ t, photoUrl, chips }: { t: T; photoUrl: string | null; chips: string[] }) {
  return (
    <section className="mt-6 overflow-hidden rounded-card bg-charcoal text-offwhite shadow-soft">
      <div className="flex items-stretch">
        <div className="relative w-[38%] max-w-[10.5rem] shrink-0 self-stretch bg-black/20">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className="absolute inset-0 size-full object-cover object-[center_25%]"
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-offwhite/35">
              <ScanFace className="size-9" aria-hidden />
            </span>
          )}
          {/* corner brackets and a slow sweep: the read, still visibly running */}
          <span className="pointer-events-none absolute inset-3 rounded-[1rem] border border-champagne/45 [clip-path:polygon(0_0,32%_0,32%_2px,2px_2px,2px_32%,0_32%,0_100%,32%_100%,32%_calc(100%-2px),2px_calc(100%-2px),2px_68%,0_68%,0_0)]" />
          <span className="pointer-events-none absolute inset-3 rounded-[1rem] border border-champagne/45 [clip-path:polygon(100%_0,68%_0,68%_2px,calc(100%-2px)_2px,calc(100%-2px)_32%,100%_32%,100%_100%,68%_100%,68%_calc(100%-2px),calc(100%-2px)_calc(100%-2px),calc(100%-2px)_68%,100%_68%,100%_0)]" />
          <span className="animate-sweep pointer-events-none absolute inset-x-0 top-0 h-10 bg-linear-to-b from-transparent via-champagne/18 to-transparent" />
        </div>

        <div className="min-w-0 flex-1 p-5">
          <p className="sp-label text-graygreen">{t("teaser.photoBadge")}</p>
          <p className="mt-2 text-[17px] leading-tight font-black">
            {t("teaser.ratios", { count: RATIOS })}
          </p>
          {chips.length > 0 && (
            <>
              <p className="mt-2.5 text-[12px] text-offwhite/55">{t("teaser.basedOn")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full bg-offwhite/10 px-2.5 py-1 text-[11px] text-offwhite/85"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </>
          )}
          {!photoUrl && (
            <p className="mt-2.5 text-[12px] text-offwhite/55">{t("teaser.photoPending")}</p>
          )}
        </div>
      </div>
    </section>
  );
}

/** Price, benefits and the button. Bottom bar on a phone, side panel on a desktop. */
function UnlockPanel({ t, onOpen }: { t: T; onOpen: () => void }) {
  const { formatNumber } = useI18n();
  return (
    <Card className="p-6">
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className="size-3.5 text-champagne" fill="currentColor" aria-hidden />
        ))}
        <span className="ms-1.5 text-[12px] text-muted">
          {t("paywall.rating", { score: RATING, count: formatNumber(REVIEWS) })}
        </span>
      </div>

      <p className="mt-4 text-[20px] leading-tight font-black">{t("paywall.title")}</p>
      <p className="mt-1.5 text-[13px] text-muted">{t("paywall.subtitle")}</p>

      <ul className="mt-5 space-y-2.5">
        {BENEFIT_KEYS.map((key) => (
          <li key={key} className="flex items-start gap-2.5 text-[13px]">
            <span className="mt-px grid size-4 shrink-0 place-items-center rounded-full bg-champagne/15">
              <Check className="size-2.5 text-champagne" strokeWidth={3.5} aria-hidden />
            </span>
            {t(key)}
          </li>
        ))}
      </ul>

      <Button fullWidth className="mt-6" onClick={onOpen}>
        <Crown className="size-4" aria-hidden />
        {t("teaser.cta")}
        <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
      </Button>
      <p className="mt-2.5 text-center text-[11px] text-faint">
        {t("teaser.startingAt", { amount: PRICE.trial })}
      </p>
    </Card>
  );
}

/* ────────────────────────────────────────────── page ─── */

export default function ResultsPreviewPage() {
  const router = useRouter();
  const { gender, photoUrl, isSubscribed, answers } = useGlow();
  const { t, dir, formatNumber } = useI18n();
  const isMale = gender === "male";
  const slides = useDemoSlides(isMale, photoUrl, t);

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const autoRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const touchX = useRef<number | null>(null);
  /** Set by a swipe, so the tap that ends it doesn't also open the paywall. */
  const swiped = useRef(false);
  /** Pausing on hover is for pointers that can hover; a tap can't un-hover. */
  const canHover = useRef(false);

  useEffect(() => {
    canHover.current = window.matchMedia("(hover: hover)").matches;
  }, []);

  // If already subscribed, skip straight to real results
  useEffect(() => {
    if (isSubscribed) router.replace("/results");
  }, [isSubscribed, router]);

  // Auto-advance, restarted from zero whenever the reader takes over
  useEffect(() => {
    if (paused || paywallOpen) return;
    autoRef.current = setInterval(
      () => setCurrent((c) => (c + 1) % slides.length),
      SLIDE_MS,
    );
    return () => clearInterval(autoRef.current);
  }, [paused, paywallOpen, slides.length, current]);

  const goTo = useCallback(
    (i: number) => {
      setCurrent((i + slides.length) % slides.length);
      clearInterval(autoRef.current);
    },
    [slides.length],
  );

  /** Chips of what they actually told us, so the personalisation is real. */
  const chips = useMemo(() => {
    const g = gender ?? "neutral";
    return [
      answers.focus && labelFor(t, "focus", FOCUS_CHOICES[g], answers.focus),
      answers.concern && labelFor(t, "concern", CONCERN_CHOICES[g], answers.concern),
      answers.hairType && labelFor(t, "hairType", HAIR_TYPE_CHOICES, answers.hairType),
      answers.aesthetic && labelFor(t, "aesthetic", AESTHETIC_CHOICES[g], answers.aesthetic),
    ].filter((chip): chip is string => Boolean(chip));
  }, [answers, gender, t]);

  const slide = slides[current];
  const openPaywall = useCallback(() => setPaywallOpen(true), []);

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchX.current;
    touchX.current = null;
    if (start === null) return;
    const delta = e.changedTouches[0].clientX - start;
    if (Math.abs(delta) < 44) return;
    // A swipe left means "next" in English and "previous" in Arabic.
    const forward = dir === "rtl" ? delta > 0 : delta < 0;
    swiped.current = true;
    goTo(current + (forward ? 1 : -1));
  }

  function onCardClick() {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    openPaywall();
  }

  return (
    <main className="animate-view">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-10 lg:pt-4">
        <div className="min-w-0">
          {/* ── header ─── */}
          <header className="safe-t">
            <p className="sp-label text-champagne">{t("teaser.eyebrow")}</p>
            <h1 className="mt-2.5 text-[clamp(1.9rem,8vw,2.5rem)] leading-[1.04] font-black tracking-[-0.022em] text-balance">
              {t("teaser.title")}
            </h1>
            <p className="mt-2.5 max-w-sm text-[14.5px] leading-relaxed text-muted">
              {highlight(
                t("teaser.found"),
                <span className="font-bold text-champagne">
                  {t("teaser.foundHighlight", { count: IMPROVEMENT_COUNT })}
                </span>,
              )}
            </p>
          </header>

          <ProofCard t={t} photoUrl={photoUrl} chips={chips} />

          {/* ── the reel ─── */}
          <section
            className="mt-7"
            onMouseEnter={() => canHover.current && setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* story bars, one per slide */}
            <div className="flex items-center gap-1.5" aria-hidden>
              {slides.map((s, i) => (
                <span
                  key={s.id}
                  className="h-1 flex-1 overflow-hidden rounded-full bg-graygreen/35"
                >
                  <span
                    key={`${s.id}-${current}`}
                    className={cn(
                      "block h-full origin-left rounded-full bg-champagne rtl:origin-right",
                      i === current && !paused && !paywallOpen && "animate-story",
                      i < current && "scale-x-100",
                      i > current && "scale-x-0",
                      i === current && (paused || paywallOpen) && "scale-x-100",
                    )}
                    style={{ ["--story-dur" as string]: `${SLIDE_MS}ms` }}
                  />
                </span>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-[1rem] bg-champagne/12">
                <slide.icon className="size-5 text-champagne" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p key={`t-${slide.id}`} className="animate-fade text-[15px] font-bold">
                  {slide.title}
                </p>
                <p key={`s-${slide.id}`} className="animate-fade text-[12px] text-muted">
                  {slide.subtitle}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-champagne/12 px-2.5 py-1 text-[10px] font-bold text-champagne uppercase">
                <Lock className="size-3" aria-hidden />
                {t("teaser.locked")}
              </span>
            </div>

            {/* The whole card is the button. It is the biggest thing on the
                screen and the thing a curious reader reaches for first. */}
            <button
              type="button"
              onClick={onCardClick}
              onTouchStart={(e) => {
                touchX.current = e.touches[0].clientX;
              }}
              onTouchEnd={onTouchEnd}
              aria-label={t("teaser.tapToUnlock")}
              className="mt-3 block w-full text-start"
            >
              <Card className="relative overflow-hidden">
                <div key={slide.id} className="animate-fade min-h-[19rem] p-4 sm:p-5">
                  {slide.content}
                </div>

                <div className="flex items-center gap-2.5 border-t border-line bg-champagne/8 px-4 py-3.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-champagne/20">
                    <Lock className="size-3.5 text-champagne" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 text-[13px] font-bold text-champagne">
                    {t("teaser.tapToUnlock")}
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-champagne rtl:-scale-x-100"
                    aria-hidden
                  />
                </div>
              </Card>
            </button>

            {/* ── every chapter, not just the first three ─── */}
            <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:px-0">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  aria-label={t("teaser.goToSlide", { title: s.title })}
                  aria-current={i === current}
                  className={cn(
                    "flex min-w-[4.75rem] shrink-0 flex-col items-center gap-1.5 rounded-[1.25rem] border p-2.5 transition-colors",
                    i === current
                      ? "border-champagne/45 bg-champagne/10"
                      : "border-line bg-surface",
                  )}
                >
                  <s.icon
                    className={cn("size-4.5", i === current ? "text-champagne" : "text-faint")}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "text-[11px]",
                      i === current ? "font-bold text-champagne" : "text-muted",
                    )}
                  >
                    {s.short}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* ── what unlocking actually buys. The desktop panel already lists
              them, so this is the phone's copy of it ─── */}
          <section className="mt-8 lg:hidden">
            <p className="sp-label text-charcoal/55">{t("teaser.whatsInside")}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {BENEFIT_KEYS.map((key) => (
                <div
                  key={key}
                  className="flex items-center gap-2.5 rounded-[1.25rem] border border-line bg-surface px-3.5 py-3"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-champagne/15">
                    <Check className="size-3.5 text-champagne" strokeWidth={3} aria-hidden />
                  </span>
                  <span className="text-[13px] font-medium">{t(key)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── proof ─── */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[12px] text-muted">
            <span className="flex -space-x-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="grid size-5 place-items-center rounded-full border-2 border-ink bg-champagne/25 text-[8px] font-bold text-champagne"
                >
                  <Check className="size-2.5" strokeWidth={4} aria-hidden />
                </span>
              ))}
            </span>
            <span>{t("teaser.unlockedToday", { count: formatNumber(UNLOCKED_TODAY) })}</span>
          </div>

          {/* ── guarantee ─── */}
          <div className="mt-4 flex items-center gap-3 rounded-card border border-champagne/20 bg-champagne/6 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-champagne/15">
              <ShieldCheck className="size-5 text-champagne" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold">{t("teaser.guaranteeTitle")}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
                {t("teaser.guaranteeBody")}
              </p>
            </div>
          </div>
        </div>

        {/* ── desktop: the offer stays on screen beside the reel ─── */}
        <aside className="hidden lg:block">
          <div className="sticky top-8">
            <UnlockPanel t={t} onOpen={openPaywall} />
          </div>
        </aside>
      </div>

      {/* ── phone: the offer sits at the very bottom, never behind it ─── */}
      <div className="safe-b sticky bottom-0 z-40 -mx-5 mt-8 border-t border-line bg-linear-to-t from-ink via-ink to-ink/85 px-5 pt-3.5 pb-3.5 backdrop-blur-xl lg:hidden">
        <Button fullWidth onClick={openPaywall}>
          <Crown className="size-4" aria-hidden />
          {t("teaser.cta")}
          <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </Button>
        <p className="mt-2 text-center text-[11px] text-faint">
          {t("teaser.startingAt", { amount: PRICE.trial })}
        </p>
      </div>

      <Paywall open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </main>
  );
}
