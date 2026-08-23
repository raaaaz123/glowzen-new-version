"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CalendarCheck,
  ListOrdered,
  Lock,
  Quote,
  Scissors,
  Sparkles,
  TrendingUp,
  Palette,
  Droplets,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { CompareSlider } from "@/components/glow/CompareSlider";
import { LanguageButton } from "@/components/app/LanguagePicker";
import { SHOWCASE } from "@/lib/data/showcase";
import { useGlow } from "@/lib/state/GlowContext";
import { useT } from "@/lib/i18n/I18nContext";
import { cn } from "@/lib/utils";

const HOW_IT_WORKS = ["how1", "how2", "how3", "how4"] as const;

/**
 * One line each — the hero should scan, not read. Kept mixed across genders so
 * nobody reads the list and assumes the app isn't built for them.
 */
const BENEFITS: { icon: LucideIcon; key: string }[] = [
  { icon: Sparkles, key: "welcome.benefit1" },
  { icon: Scissors, key: "welcome.benefit2" },
  { icon: ListOrdered, key: "welcome.benefit3" },
  { icon: CalendarCheck, key: "welcome.benefit4" },
];

/**
 * Deliberately not the same three points as BENEFITS above. Those say what the
 * analysis is; these say what you leave with — the parts you can't get by
 * standing in front of a mirror, which is the only alternative on offer.
 */
const MIRROR: { icon: LucideIcon; key: string }[] = [
  { icon: Sparkles, key: "mirror1" },
  { icon: Quote, key: "mirror2" },
  { icon: TrendingUp, key: "mirror3" },
  { icon: Palette, key: "mirror4" },
  { icon: Droplets, key: "mirror5" },
  { icon: UserCheck, key: "mirror6" },
];

export default function WelcomePage() {
  const t = useT();
  const { hasAnalysis, hydrated } = useGlow();
  const [howOpen, setHowOpen] = useState(false);
  const [set, setSet] = useState(0);

  const showcase = SHOWCASE[set];

  return (
    <main>
      <section className="min-h-svh lg:grid lg:min-h-svh lg:place-items-center lg:px-8 lg:py-10">
      <div className="lg:grid lg:w-full lg:max-w-[1200px] lg:grid-cols-[1fr_1.05fr] lg:grid-rows-[auto_auto] lg:items-center lg:gap-x-16">
        {/* ——— words */}
        <div className="shell safe-t px-5 lg:col-start-1 lg:row-start-1 lg:max-w-none lg:self-end lg:px-0 lg:pt-0">
          {/* The one control a visitor in the wrong language has to be able to
              find, so it sits above the headline rather than in a footer. */}
          <LanguageButton className="mb-6" />

          <h1 className="type-display text-[clamp(2.5rem,10vw,3.75rem)] lg:text-[clamp(3.25rem,4.2vw,4.5rem)]">
            {t("welcome.titleLine1")}
            <br />
            {t("welcome.titleLine2Before")}
            <em className="text-champagne not-italic">{t("welcome.titleLine2Accent")}</em>
          </h1>

          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted lg:mt-5 lg:text-base">
            {t("welcome.subtitle")}
          </p>
        </div>

        {/* ——— the thing itself: drag the line */}
        <section
          className="mt-7 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-center"
          aria-label={t("welcome.exampleRegion")}
        >
          <div className="shell px-5 lg:max-w-none lg:px-0">
            <div
              role="tablist"
              aria-label={t("welcome.chooseExample")}
              className="mx-auto mb-3 flex w-full max-w-[16rem] gap-1 rounded-full border border-line bg-surface p-1 lg:mx-0"
            >
              {SHOWCASE.map((item, i) => (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={i === set}
                  onClick={() => setSet(i)}
                  className={cn(
                    "flex-1 rounded-full py-2 text-[13px] font-medium transition-colors duration-200",
                    i === set ? "bg-champagne text-on-accent" : "text-muted hover:text-cream",
                  )}
                >
                  {t(item.labelKey)}
                </button>
              ))}
            </div>

            <CompareSlider
              key={showcase.id}
              before={showcase.before}
              after={showcase.after}
              beforeLabel={t("common.before")}
              afterLabel={t("common.after")}
              frameClassName="aspect-[4/5] max-h-[46svh] lg:max-h-[70svh]"
              imagePosition="object-[center_22%]"
              priority
            />

            <p className="mt-3 text-center text-[12px] leading-relaxed text-faint lg:text-start">
              {t("welcome.dragTheLine", { caption: t(showcase.captionKey) })}
              <br className="hidden sm:block" />{" "}
              <span className="text-faint/80">{t("welcome.illustrative")}</span>
            </p>
          </div>
        </section>

        {/* ——— actions */}
        <div className="shell mt-7 px-5 pb-10 lg:col-start-1 lg:row-start-2 lg:mt-8 lg:max-w-none lg:self-start lg:px-0 lg:pb-0">
          <div className="space-y-3 lg:max-w-sm">
            <ButtonLink href="/questionnaire" fullWidth size="lg">
              {t("welcome.start")}
              <ArrowRight className="size-5 rtl:-scale-x-100" aria-hidden />
            </ButtonLink>
          </div>

          <ul className="mt-6 space-y-2.5 lg:max-w-sm">
            {BENEFITS.map(({ icon: Icon, key }) => (
              <li key={key} className="flex items-center gap-3 text-[13.5px] text-muted">
                <Icon className="size-4 shrink-0 text-champagne" aria-hidden />
                {t(key)}
              </li>
            ))}
          </ul>

          <p className="mt-7 flex items-center justify-center gap-2 text-[12px] text-faint lg:justify-start">
            <Lock className="size-3.5" aria-hidden />
            {t("welcome.privacy")}
          </p>

          {hydrated && hasAnalysis && (
            <p className="animate-fade mt-6 text-center text-[13px] text-muted lg:text-start">
              {t("welcome.alreadyStarted")}{" "}
              <Link href="/home" className="text-champagne underline underline-offset-4">
                {t("welcome.goToReport")}
              </Link>
            </p>
          )}
        </div>
      </div>
      </section>

      {/* ——— what a mirror can't do */}
      <section className="border-t border-line" aria-labelledby="mirror-heading">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-16 lg:px-8 lg:py-20">
          <p className="eyebrow">{t("welcome.mirrorEyebrow")}</p>
          <h2
            id="mirror-heading"
            className="type-display mt-3 max-w-xl text-[clamp(1.75rem,5.5vw,2.5rem)] text-balance"
          >
            {t("welcome.mirrorHeading")}
          </h2>

          <div className="mt-9 grid gap-10 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:gap-x-14 lg:gap-y-16">
            {MIRROR.map(({ icon: Icon, key }) => (
              <div key={key} className="flex flex-col">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-champagne/10 shadow-sm border border-champagne/10">
                  <Icon className="size-5 text-champagne" strokeWidth={2} aria-hidden />
                </div>
                <h3 className="type-display mt-5 text-[19px] tracking-tight">{t(`welcome.${key}Title`)}</h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-muted max-w-sm">
                  {t(`welcome.${key}Body`)}
                </p>
              </div>
            ))}
          </div>

          <ButtonLink href="/questionnaire" className="mt-12 lg:mt-16">
            {t("welcome.start")}
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
          </ButtonLink>
        </div>
      </section>

      {/* ——— how it works */}
      <section className="border-t border-line bg-surface/30">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-16 lg:px-8 lg:py-20">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div>
              <p className="eyebrow">{t("welcome.mirrorEyebrow")}</p>
              <h2 className="type-display mt-3 max-w-xl text-[clamp(1.75rem,5.5vw,2.5rem)] text-balance">
                How it works
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-muted max-w-md">
                {t("welcome.howDescription")}
              </p>
            </div>
            
            <ol className="mt-10 space-y-8 lg:mt-0">
              {HOW_IT_WORKS.map((step, i) => (
                <li key={step} className="flex gap-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-champagne/10 font-mono text-[13px] font-semibold text-champagne">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="type-display text-[18px]">{t(`welcome.${step}Title`)}</h3>
                    <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">
                      {t(`welcome.${step}Body`)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ——— social proof */}
      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-16 lg:px-8 lg:py-20 text-center">
          <p className="eyebrow text-center mb-10">Trusted by over 10,000+ users</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                text: "The analysis was spot on. I changed my haircut and the difference is literally night and day. Worth every penny.",
                name: "Michael T.",
              },
              {
                text: "I was skeptical at first, but the virtual try-on for the makeup shades actually matched my skin tone perfectly.",
                name: "Sarah J.",
              },
              {
                text: "A 30-day plan that is actually realistic. I'm 2 weeks in and getting compliments daily.",
                name: "David K.",
              }
            ].map((review, i) => (
              <div key={i} className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-6 text-left shadow-sm">
                <p className="text-[14.5px] leading-relaxed text-cream/90">"{review.text}"</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="size-10 rounded-full bg-champagne/20 flex items-center justify-center text-champagne font-semibold text-[14px]">
                    {review.name[0]}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-cream">{review.name}</p>
                    <div className="flex text-champagne mt-0.5">
                      {[...Array(5)].map((_, j) => (
                        <svg key={j} className="size-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ——— final cta */}
      <section className="border-t border-line bg-champagne/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-transparent to-surface/40 pointer-events-none" />
        <div className="mx-auto w-full max-w-[800px] px-5 py-20 lg:py-28 text-center relative z-10">
          <h2 className="type-display text-[clamp(2.25rem,6vw,3.5rem)] text-cream">
            Ready to meet your best self?
          </h2>
          <p className="mt-4 text-[16px] text-muted mx-auto max-w-md">
            Join the thousands who have already transformed their look with our AI-powered analysis.
          </p>
          <div className="mt-10 flex justify-center">
            <ButtonLink href="/questionnaire" size="lg" className="px-8 shadow-xl">
              {t("welcome.start")}
              <ArrowRight className="size-5 rtl:-scale-x-100" aria-hidden />
            </ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}
