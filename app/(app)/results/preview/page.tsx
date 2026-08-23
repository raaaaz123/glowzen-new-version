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
  Crown,
  Lock,
  Palette,
  Scissors,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressRing, ImpactMeter } from "@/components/ui/ProgressRing";
import { Paywall } from "@/components/app/Paywall";
import { useGlow } from "@/lib/state/GlowContext";
import { useI18n } from "@/lib/i18n/I18nContext";
import { cn } from "@/lib/utils";
import type { Vars } from "@/lib/i18n/translate";

type T = (path: string, vars?: Vars) => string;

/** The cheapest price on the paywall — kept in sync with Paywall's own table. */
const FROM_PRICE = "$0.99";
const IMPROVEMENT_COUNT = 3;
const UNLOCKED_TODAY = 12847;

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

/* ────────────────────────────────────────────── demo slide data ─── */

interface Slide {
  id: string;
  icon: typeof Star;
  title: string;
  short: string;
  subtitle: string;
  color: string;
  content: React.ReactNode;
}

/**
 * Static demo data that looks realistic but is generic enough to work for any
 * face. The real data is gated behind the subscription — this just needs to
 * feel real enough that the user wants to unlock it.
 */
function useDemoSlides(isMale: boolean, t: T): Slide[] {
  return useMemo(
    () => [
      {
        id: "score",
        icon: TrendingUp,
        title: t("teaser.slides.score.title"),
        short: t("teaser.slides.score.short"),
        subtitle: t("teaser.slides.score.subtitle"),
        color: "text-champagne",
        content: <ScoreSlide t={t} />,
      },
      {
        id: "hair",
        icon: Scissors,
        title: t("teaser.slides.hair.title"),
        short: t("teaser.slides.hair.short"),
        subtitle: t("teaser.slides.hair.subtitle", { count: 3 }),
        color: "text-champagne",
        content: <HairSlide t={t} />,
      },
      isMale
        ? {
            id: "beard",
            icon: Scissors,
            title: t("teaser.slides.beard.title"),
            short: t("teaser.slides.beard.short"),
            subtitle: t("teaser.slides.beard.subtitle"),
            color: "text-champagne",
            content: <BeardSlide t={t} />,
          }
        : {
            id: "makeup",
            icon: Palette,
            title: t("teaser.slides.makeup.title"),
            short: t("teaser.slides.makeup.short"),
            subtitle: t("teaser.slides.makeup.subtitle"),
            color: "text-champagne",
            content: <MakeupSlide t={t} />,
          },
      {
        id: "areas",
        icon: Star,
        title: t("teaser.slides.areas.title"),
        short: t("teaser.slides.areas.short"),
        subtitle: t("teaser.slides.areas.subtitle"),
        color: "text-champagne",
        content: <AreasSlide t={t} />,
      },
      {
        id: "plan",
        icon: Zap,
        title: t("teaser.slides.plan.title"),
        short: t("teaser.slides.plan.short"),
        subtitle: t("teaser.slides.plan.subtitle"),
        color: "text-champagne",
        content: <PlanSlide t={t} />,
      },
    ],
    [isMale, t],
  );
}

/* ────────────────────────────────────────────── page component ─── */

export default function ResultsPreviewPage() {
  const router = useRouter();
  const { gender, isSubscribed } = useGlow();
  const { t, formatNumber } = useI18n();
  const isMale = gender === "male";
  const slides = useDemoSlides(isMale, t);

  const [current, setCurrent] = useState(0);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const autoRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // If already subscribed, skip straight to real results
  useEffect(() => {
    if (isSubscribed) router.replace("/results");
  }, [isSubscribed, router]);

  // Auto-advance slides
  useEffect(() => {
    autoRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 3500);
    return () => clearInterval(autoRef.current);
  }, [slides.length]);

  const goTo = useCallback(
    (i: number) => {
      setCurrent(i);
      clearInterval(autoRef.current);
      autoRef.current = setInterval(() => {
        setCurrent((c) => (c + 1) % slides.length);
      }, 3500);
    },
    [slides.length],
  );

  const slide = slides[current];

  return (
    <>
      <main className="relative min-h-svh pb-32">
        {/* ambient glow */}
        <div
          className="animate-halo pointer-events-none fixed top-1/4 left-1/2 size-[400px] -translate-x-1/2 rounded-full bg-champagne/8 blur-[100px]"
          aria-hidden
        />

        {/* header */}
        <div className="px-5 pt-8 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-champagne/12">
            <Sparkles className="size-6 text-champagne" />
          </div>
          <h1 className="type-display text-[clamp(1.5rem,6vw,2rem)]">
            {t("teaser.title")}
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-[14px] text-muted">
            {highlight(
              t("teaser.found"),
              <span className="text-champagne font-medium">
                {t("teaser.foundHighlight", { count: IMPROVEMENT_COUNT })}
              </span>,
            )}
          </p>
        </div>

        {/* ── slide area ─── */}
        <div className="shell mt-6 px-5">
          {/* slide header */}
          <div className="flex items-center gap-3 mb-4" key={slide.id}>
            <span className="grid size-10 place-items-center rounded-2xl bg-champagne/12">
              <slide.icon className={cn("size-5", slide.color)} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium animate-fade" key={`t-${slide.id}`}>
                {slide.title}
              </p>
              <p className="text-[12px] text-muted animate-fade" key={`s-${slide.id}`}>
                {slide.subtitle}
              </p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-champagne/10 px-2.5 py-1 text-[10px] font-bold text-champagne uppercase">
              <Lock className="size-3" />
              {t("teaser.locked")}
            </span>
          </div>

          {/* blurred card */}
          <Card className="relative overflow-hidden p-5">
            {/* blur overlay */}
            <div className="absolute inset-0 z-10 backdrop-blur-[14px]" />
            {/* lock icon overlay */}
            <div className="absolute inset-0 z-20 grid place-items-center">
              <div className="flex flex-col items-center gap-3 animate-rise">
                <span className="grid size-14 place-items-center rounded-full bg-champagne/15 shadow-[0_0_30px_-4px_var(--accent-glow)]">
                  <Lock className="size-6 text-champagne" />
                </span>
                <p className="text-[13px] font-medium text-cream/80">
                  {t("teaser.subscribeToUnlock")}
                </p>
              </div>
            </div>

            {/* the "content" behind the blur */}
            <div className="animate-fade min-h-[280px]" key={slide.id}>
              {slide.content}
            </div>
          </Card>

          {/* ── dots ─── */}
          <div className="mt-5 flex items-center justify-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === current
                    ? "w-6 bg-champagne"
                    : "w-1.5 bg-cream/20 hover:bg-cream/40",
                )}
                aria-label={t("teaser.goToSlide", { title: s.title })}
              />
            ))}
          </div>

          {/* ── social proof ─── */}
          <div className="mt-6 flex items-center justify-center gap-2 text-[12px] text-muted">
            <div className="flex -space-x-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="inline-grid size-5 place-items-center rounded-full border-2 border-surface bg-champagne/20 text-[8px] font-bold text-champagne"
                >
                  ✓
                </span>
              ))}
            </div>
            <span>
              {t("teaser.unlockedToday", { count: formatNumber(UNLOCKED_TODAY) })}
            </span>
          </div>

          {/* ── categories preview ─── */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {slides.slice(0, 3).map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(i)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all",
                  i === current
                    ? "border-champagne/40 bg-champagne/8"
                    : "border-line bg-raised/50",
                )}
              >
                <s.icon
                  className={cn(
                    "size-5",
                    i === current ? "text-champagne" : "text-faint",
                  )}
                />
                {/* A dedicated short label — truncating the title on spaces
                    produces nothing usable in Japanese or Arabic. */}
                <span className="text-[11px] text-muted">{s.short}</span>
              </button>
            ))}
          </div>

          {/* ── guarantee ─── */}
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-champagne/15 bg-champagne/5 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-champagne/15">
              <Star className="size-5 text-champagne" fill="currentColor" />
            </span>
            <div>
              <p className="text-[13px] font-medium">{t("teaser.guaranteeTitle")}</p>
              <p className="mt-0.5 text-[12px] text-muted">
                {t("teaser.guaranteeBody")}
              </p>
            </div>
          </div>
        </div>

        {/* ── sticky CTA ─── */}
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 backdrop-blur-lg">
          <div className="shell px-5 py-4 safe-b">
            <Button fullWidth size="lg" onClick={() => setPaywallOpen(true)}>
              <Crown className="size-4" aria-hidden />
              {t("teaser.cta")}
              <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
            </Button>
            <p className="mt-2 text-center text-[11px] text-faint">
              {t("teaser.startingAt", { amount: FROM_PRICE })}
            </p>
          </div>
        </div>
      </main>

      <Paywall open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </>
  );
}

/* ────────────────────────────────────────────── demo slides ─── */

/** Score ring with fake numbers (blurred anyway) */
function ScoreSlide({ t }: { t: T }) {
  const areas = [
    { label: t("teaser.demo.areaHair"), value: 82 },
    { label: t("teaser.demo.areaSkin"), value: 65 },
    { label: t("teaser.demo.areaGrooming"), value: 71 },
  ];
  return (
    <div className="flex flex-col items-center gap-4 pt-4">
      <ProgressRing value={73} size={140} stroke={7}>
        <div>
          <p className="type-display text-[2.4rem] leading-none">73</p>
          <p className="eyebrow mt-1.5 text-[9px]">{t("teaser.demo.opportunity")}</p>
        </div>
      </ProgressRing>
      <p className="max-w-[16rem] text-center text-[14px] text-muted">
        {t("teaser.demo.scoreBlurb")}
      </p>
      <div className="w-full space-y-3 mt-2">
        {areas.map((s) => (
          <div key={s.label}>
            <div className="mb-1 flex justify-between text-[13px]">
              <span className="text-cream/80">{s.label}</span>
              <span className="font-mono text-[11px] text-faint">{s.value}</span>
            </div>
            <ImpactMeter value={s.value} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Fake hairstyle cards */
function HairSlide({ t }: { t: T }) {
  const cuts = [
    { name: t("teaser.demo.cut1"), match: 94, desc: t("teaser.demo.cut1Desc") },
    { name: t("teaser.demo.cut2"), match: 88, desc: t("teaser.demo.cut2Desc") },
    { name: t("teaser.demo.cut3"), match: 82, desc: t("teaser.demo.cut3Desc") },
  ];
  return (
    <div className="space-y-3">
      {cuts.map((c) => (
        <div key={c.name} className="flex items-center gap-3 rounded-xl border border-line/50 p-3">
          <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-raised">
            <span className="type-display text-[1.2rem] text-champagne">{c.match}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium">{c.name}</p>
            <p className="mt-0.5 text-[12px] text-muted">{c.desc}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="font-mono text-[11px] text-champagne">
                {t("common.matchPct", { value: c.match })}
              </span>
              <ImpactMeter value={c.match} className="flex-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Fake beard analysis */
function BeardSlide({ t }: { t: T }) {
  const styles = [
    { name: t("teaser.demo.beard1"), match: 91, desc: t("teaser.demo.beard1Desc") },
    { name: t("teaser.demo.beard2"), match: 85, desc: t("teaser.demo.beard2Desc") },
    { name: t("teaser.demo.beard3"), match: 78, desc: t("teaser.demo.beard3Desc") },
  ];
  return (
    <div className="space-y-3">
      <div className="mb-4 rounded-xl bg-champagne/8 p-3 text-center">
        <p className="text-[13px] font-medium">
          {highlight(
            t("teaser.demo.beardVerdict"),
            <span className="text-champagne">{t("teaser.demo.beardVerdictValue")}</span>,
          )}
        </p>
        <p className="mt-1 text-[12px] text-muted">{t("teaser.demo.beardVerdictNote")}</p>
      </div>
      {styles.map((s) => (
        <div key={s.name} className="flex items-center gap-3 rounded-xl border border-line/50 p-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-raised">
            <Scissors className="size-5 text-champagne" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium">{s.name}</p>
            <p className="mt-0.5 text-[12px] text-muted">{s.desc}</p>
            <span className="mt-1 inline-block font-mono text-[11px] text-champagne">
              {t("common.matchPct", { value: s.match })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Fake makeup color palette */
function MakeupSlide({ t }: { t: T }) {
  const swatches = [
    { label: t("teaser.demo.swatchFoundation"), colors: ["#e8c9a0", "#d4a574", "#c49068"] },
    { label: t("teaser.demo.swatchLip"), colors: ["#c85c5c", "#d47a7a", "#b04848"] },
    { label: t("teaser.demo.swatchEye"), colors: ["#8b7355", "#a0845c", "#6b5840"] },
    { label: t("teaser.demo.swatchCheek"), colors: ["#d4917a", "#c98070", "#e0a090"] },
  ];
  return (
    <div className="space-y-4">
      <div className="mb-4 rounded-xl bg-champagne/8 p-3 text-center">
        <p className="text-[13px] font-medium">
          {highlight(
            t("teaser.demo.undertoneLine"),
            <span className="text-champagne">{t("makeup.undertone.warm")}</span>,
          )}
        </p>
        <p className="mt-1 text-[12px] text-muted">{t("teaser.demo.depthSeason")}</p>
      </div>
      {swatches.map((s) => (
        <div key={s.label} className="flex items-center gap-3">
          <span className="w-20 text-[13px] text-muted">{s.label}</span>
          <div className="flex gap-2">
            {s.colors.map((hex) => (
              <span
                key={hex}
                className="size-8 rounded-full border border-cream/10"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
      ))}
      <p className="mt-2 text-[12px] text-muted">
        {t("teaser.demo.looksNote", { count: 3 })}
      </p>
    </div>
  );
}

/** Fake area scores */
function AreasSlide({ t }: { t: T }) {
  const areas = [
    { label: t("teaser.demo.area1"), value: 82, note: t("teaser.demo.area1Note") },
    { label: t("teaser.demo.area2"), value: 65, note: t("teaser.demo.area2Note") },
    { label: t("teaser.demo.area3"), value: 71, note: t("teaser.demo.area3Note") },
    { label: t("teaser.demo.area4"), value: 60, note: t("teaser.demo.area4Note") },
  ];
  return (
    <div className="space-y-4">
      {areas.map((a) => (
        <div key={a.label}>
          <div className="mb-1 flex justify-between text-[13px]">
            <span className="text-cream/90">{a.label}</span>
            <span className="font-mono text-[11px] text-faint">{a.value}</span>
          </div>
          <ImpactMeter value={a.value} />
          <p className="mt-1 text-[12px] text-faint">{a.note}</p>
        </div>
      ))}
    </div>
  );
}

/** Fake 8-week plan */
function PlanSlide({ t }: { t: T }) {
  const weeks = [
    { week: 1, title: t("teaser.demo.week1"), tasks: [t("teaser.demo.week1a"), t("teaser.demo.week1b")] },
    { week: 2, title: t("teaser.demo.week2"), tasks: [t("teaser.demo.week2a"), t("teaser.demo.week2b")] },
    { week: 4, title: t("teaser.demo.week4"), tasks: [t("teaser.demo.week4a"), t("teaser.demo.week4b")] },
    { week: 8, title: t("teaser.demo.week8"), tasks: [t("teaser.demo.week8a"), t("teaser.demo.week8b")] },
  ];
  return (
    <div className="space-y-3">
      {weeks.map((w) => (
        <div key={w.week} className="flex gap-3 rounded-xl border border-line/50 p-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-champagne/12">
            <span className="text-[12px] font-bold text-champagne">
              {t("teaser.demo.weekBadge", { n: w.week })}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium">{w.title}</p>
            <ul className="mt-1 space-y-0.5">
              {w.tasks.map((task) => (
                <li key={task} className="text-[12px] text-muted">
                  • {task}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
