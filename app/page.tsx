"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarCheck, ListOrdered, Lock, Scissors } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { CompareSlider } from "@/components/glow/CompareSlider";
import { SHOWCASE } from "@/lib/data/showcase";
import { useGlow } from "@/lib/state/GlowContext";
import { cn } from "@/lib/utils";

const HOW_IT_WORKS = [
  { title: "Eight quick questions", body: "What you want, and what a photo can't tell us." },
  { title: "One clear photo", body: "Processed privately. Delete it any time." },
  { title: "Your three changes", body: "Ranked by impact — never by how you score." },
  { title: "A 30-day plan", body: "Sized to the minutes you actually have." },
];

/**
 * One line each — the hero should scan, not read. Kept mixed across genders so
 * nobody reads the list and assumes the app isn't built for them.
 */
const BENEFITS = [
  { icon: ListOrdered, text: "Ranked by impact — what to do first, not a score." },
  { icon: Scissors, text: "Specific to you — your cut, brows, beard, shades." },
  { icon: CalendarCheck, text: "A 30-day plan sized to the time you have." },
];

export default function WelcomePage() {
  const { hasAnalysis, hydrated } = useGlow();
  const [howOpen, setHowOpen] = useState(false);
  const [set, setSet] = useState(0);

  const showcase = SHOWCASE[set];

  return (
    <main className="min-h-svh lg:grid lg:min-h-svh lg:place-items-center lg:px-8 lg:py-10">
      <div className="lg:grid lg:w-full lg:max-w-[1200px] lg:grid-cols-[1fr_1.05fr] lg:grid-rows-[auto_auto] lg:items-center lg:gap-x-16">
        {/* ——— words */}
        <div className="shell safe-t px-5 lg:col-start-1 lg:row-start-1 lg:max-w-none lg:self-end lg:px-0 lg:pt-0">
          <h1 className="type-display text-[clamp(2.5rem,10vw,3.75rem)] lg:text-[clamp(3.25rem,4.2vw,4.5rem)]">
            Know what to
            <br />
            change <em className="text-champagne not-italic">first.</em>
          </h1>

          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted lg:mt-5 lg:text-base">
            One photo. Your three highest-impact changes, and a 30-day plan to make them.
          </p>
        </div>

        {/* ——— the thing itself: drag the line */}
        <section
          className="mt-7 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-center"
          aria-label="Before and after example"
        >
          <div className="shell px-5 lg:max-w-none lg:px-0">
            <div
              role="tablist"
              aria-label="Choose an example"
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
                  {item.label}
                </button>
              ))}
            </div>

            <CompareSlider
              key={showcase.id}
              before={showcase.before}
              after={showcase.after}
              beforeLabel="Before"
              afterLabel="After"
              frameClassName="aspect-[4/5] max-h-[46svh] lg:max-h-[70svh]"
              imagePosition="object-[center_22%]"
              priority
            />

            <p className="mt-3 text-center text-[12px] leading-relaxed text-faint lg:text-left">
              Drag the line. {showcase.caption}.
              <br className="hidden sm:block" />{" "}
              <span className="text-faint/80">Illustrative example, not a real customer.</span>
            </p>
          </div>
        </section>

        {/* ——— actions */}
        <div className="shell mt-7 px-5 pb-10 lg:col-start-1 lg:row-start-2 lg:mt-8 lg:max-w-none lg:self-start lg:px-0 lg:pb-0">
          <div className="space-y-3 lg:max-w-sm">
            <ButtonLink href="/questionnaire" fullWidth>
              Start my glow-up
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <Button variant="secondary" fullWidth onClick={() => setHowOpen(true)}>
              What you'll get
            </Button>
          </div>

          <ul className="mt-6 space-y-2.5 lg:max-w-sm">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[13.5px] text-muted">
                <Icon className="size-4 shrink-0 text-champagne" aria-hidden />
                {text}
              </li>
            ))}
          </ul>

          <p className="mt-7 flex items-center justify-center gap-2 text-[12px] text-faint lg:justify-start">
            <Lock className="size-3.5" aria-hidden />
            Private, never shared, yours to delete.
          </p>

          {hydrated && hasAnalysis && (
            <p className="animate-fade mt-6 text-center text-[13px] text-muted lg:text-left">
              Already started?{" "}
              <Link href="/home" className="text-champagne underline underline-offset-4">
                Go to your report
              </Link>
            </p>
          )}
        </div>
      </div>

      <Sheet
        open={howOpen}
        onClose={() => setHowOpen(false)}
        title="What you'll get"
        description="About two minutes of questions, then it's yours."
        footer={
          <ButtonLink href="/questionnaire" fullWidth onClick={() => setHowOpen(false)}>
            Start my glow-up
          </ButtonLink>
        }
      >
        <ol className="space-y-5 pb-2">
          {HOW_IT_WORKS.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="mt-0.5 font-mono text-[11px] text-champagne">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-[15px] font-medium">{step.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Sheet>
    </main>
  );
}
