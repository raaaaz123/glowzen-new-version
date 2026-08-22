"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, FlaskConical, Info, Palette, Scissors } from "lucide-react";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { ImpactMeter, ProgressRing } from "@/components/ui/ProgressRing";
import { Sheet } from "@/components/ui/Sheet";
import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { ErrorState, NothingYet } from "@/components/ui/States";
import { TopBar } from "@/components/app/TopBar";
import { useAsync } from "@/lib/useAsync";
import { useGlow } from "@/lib/state/GlowContext";
import { getAnalysis } from "@/services/analysisService";

export default function ResultsPage() {
  const { gender, photoUrl } = useGlow();
  const { data, loading, error, empty, reload } = useAsync(() => getAnalysis(gender), [gender]);
  const [methodOpen, setMethodOpen] = useState(false);

  return (
    <main>
      <TopBar
        back={false}
        title="Your Glow-Up Report"
        action={
          <button
            onClick={() => setMethodOpen(true)}
            className="flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-cream"
          >
            <Info className="size-3.5" aria-hidden />
            How to read this
          </button>
        }
      />

      {empty && (
        <div className="mt-8">
          <NothingYet empty={empty} title="Your report lands here" />
        </div>
      )}

      {error && (
        <div className="mt-8">
          <ErrorState message={error} onRetry={reload} />
        </div>
      )}

      {loading && !error && !empty && (
        <div className="mt-8 space-y-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-64 w-full rounded-card" />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {data && (
        <div className="animate-rise">
          <p className="mt-7 max-w-md text-[15px] leading-relaxed text-muted">
            We found <span className="text-cream">3 changes</span> that could make the biggest
            difference.
          </p>

          {/* ——— the one thing to do first */}
          <Card tone="linen" className="mt-6 flex flex-col-reverse overflow-hidden lg:flex-row lg:items-stretch">
            <div className="p-6 lg:flex-1 lg:p-8">
              <p className="font-mono text-[10px] tracking-[0.18em] text-black/45 uppercase">
                Your biggest opportunity
              </p>
              <h2 className="type-display mt-3 text-[clamp(2.4rem,10vw,3.4rem)] leading-[0.95]">
                {data.opportunities[0].title}
              </h2>

              <div className="mt-5 flex items-center gap-3">
                <span className="font-mono text-[13px] font-medium text-black/70">
                  {data.opportunities[0].impact} impact
                </span>
                <span className="h-1 flex-1 overflow-hidden rounded-full bg-black/10">
                  <span
                    className="block h-full rounded-full bg-champagne-lo"
                    style={{ width: `${data.opportunities[0].impact}%` }}
                  />
                </span>
              </div>

              <p className="mt-5 text-[14.5px] leading-relaxed text-black/70">
                {data.opportunities[0].description}
              </p>

              <Link
                href="/styles"
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-linen-ink px-5 py-3.5 text-[14px] font-medium text-linen transition-transform active:scale-[.98]"
              >
                See recommended styles
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>

            <ImageFrame
              src={data.opportunities[0].image}
              alt={`${data.opportunities[0].title} example`}
              ratio="aspect-[16/10] lg:aspect-auto"
              className="lg:w-64 lg:shrink-0"
              imgClassName={data.opportunities[0].imagePosition}
              expandable
            />
          </Card>

          {/* ——— the other two */}
          <div className="mt-4 space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {data.opportunities.slice(1).map((op, i) => (
              <Card key={op.id} className="overflow-hidden">
                <ImageFrame
                  src={op.image}
                  alt={`${op.title} example`}
                  ratio="aspect-[3/2]"
                  imgClassName={op.imagePosition}
                  overlay={
                    <span className="absolute bottom-3 left-4 rounded-full bg-black/50 px-2.5 py-1.5 font-mono text-[10px] tracking-[0.18em] text-white/90 uppercase backdrop-blur-md">
                      {String(i + 2).padStart(2, "0")} / 03
                    </span>
                  }
                />
                <div className="p-5">
                  <h3 className="type-display text-[1.6rem]">{op.title}</h3>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="font-mono text-[12px] text-champagne">{op.impact} impact</span>
                    <ImpactMeter value={op.impact} className="flex-1" />
                  </div>
                  <p className="mt-3.5 text-[13.5px] leading-relaxed text-muted">{op.description}</p>
                  <Link
                    href="/improvements"
                    className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-champagne underline-offset-4 hover:underline"
                  >
                    What to do about it
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          {/* ——— where things stand */}
          <section className="mt-10">
            <SectionHeader
              eyebrow="Today"
              title="Where your look stands"
              action={
                <Link href="/improvements" className="text-[13px] text-champagne">
                  Start here
                </Link>
              }
            />

            <Card className="p-6 sm:flex sm:items-center sm:gap-8">
              <div className="flex flex-col items-center sm:shrink-0">
                <ProgressRing value={data.overall} size={140} stroke={7}>
                  <div>
                    <p className="type-display text-[2.4rem] leading-none">
                      {data.overall}
                    </p>
                    <p className="eyebrow mt-1.5 text-[9px]">Opportunity</p>
                  </div>
                </ProgressRing>
                <p className="mt-4 max-w-[15rem] text-center text-[13px] leading-relaxed text-muted sm:hidden">
                  {data.summary}
                </p>
              </div>

              <div className="mt-6 flex-1 space-y-4 sm:mt-0">
                <p className="hidden text-[13.5px] leading-relaxed text-muted sm:block">
                  {data.summary}
                </p>
                {data.scores.map((s) => (
                  <div key={s.key}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="text-[13.5px] text-cream/90">{s.label}</span>
                      <span className="font-mono text-[11px] text-faint">{s.value}</span>
                    </div>
                    <ImpactMeter value={s.value} />
                    <p className="mt-1.5 text-[12px] text-faint">{s.note}</p>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          {data.makeup && (
            <Link href="/makeup" className="mt-6 block">
              <Card className="flex items-center gap-4 p-5 transition-colors hover:border-champagne/35">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-champagne/12 text-champagne">
                  <Palette className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium">Your makeup shades</p>
                  <p className="mt-0.5 text-[13px] text-muted capitalize">
                    {data.makeup.undertone} undertone · {data.makeup.looks.length} looks matched
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {data.makeup.lip.slice(0, 3).map((sh) => (
                    <span
                      key={sh.name}
                      className="size-6 rounded-full border border-cream/10"
                      style={{ backgroundColor: sh.hex }}
                      aria-hidden
                    />
                  ))}
                </div>
              </Card>
            </Link>
          )}

          {data.beard && (
            <Link href="/beard" className="mt-6 block">
              <Card className="flex items-center gap-4 p-5 transition-colors hover:border-champagne/35">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-champagne/12 text-champagne">
                  <Scissors className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium">Your facial hair</p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {data.beard.verdict === "clean-shaven"
                      ? "Clean-shaven suits you best"
                      : `${data.beard.styles.length} shapes matched to your growth`}
                  </p>
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-faint" aria-hidden />
              </Card>
            </Link>
          )}

          {photoUrl && (
            <p className="mt-6 text-[12px] text-faint">
              Based on the photo you added. Retake it any time from Analyze.
            </p>
          )}

          <div className="mt-8 mb-4">
            <ButtonLink href="/improvements" fullWidth>
              See your top 3 improvements
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
        </div>
      )}

      <Sheet
        open={methodOpen}
        onClose={() => setMethodOpen(false)}
        title="How to read this"
        description="What these numbers are, and what they aren't."
      >
        <div className="space-y-4 pb-2 text-[13.5px] leading-relaxed text-muted">
          <p>
            <span className="text-cream">Impact</span> estimates how much of a visible difference a
            change would make for you. It says nothing about how you look now.
          </p>
          <p>
            <span className="text-cream">Opportunity</span> is headroom — how much of your look is
            still up for grabs. A high number is a good thing.
          </p>
          <p>
            Everything here is an AI-generated suggestion based on your photo and answers. It is not
            a measurement, a diagnosis, or a judgement of you.
          </p>
        </div>
      </Sheet>
    </main>
  );
}
