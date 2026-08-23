"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowUpRight, FlaskConical, Info, Palette, Scissors } from "lucide-react";
import { useEffect, useState } from "react";
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
import { useT } from "@/lib/i18n/I18nContext";
import { getAnalysis } from "@/services/analysisService";

export default function ResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const { gender, photoUrl, isSubscribed, setSubscription, hydrated } = useGlow();
  const { data, loading, error, empty, reload } = useAsync(() => getAnalysis(gender), [gender]);
  const [methodOpen, setMethodOpen] = useState(false);

  // After a successful Polar checkout, the user lands here with ?subscribed=1.
  // The webhook may not have fired yet, so optimistically mark as subscribed
  // and let the Firestore hydration confirm it.
  useEffect(() => {
    if (searchParams.get("subscribed") === "1") {
      setSubscription({
        active: true,
        plan: null,
        expiresAt: null,
        polarCustomerId: null,
        polarSubscriptionId: null,
      });
      // Clean the URL
      router.replace("/results");
    }
  }, [searchParams, setSubscription, router]);

  // Non-subscribers who land here directly get redirected to the preview
  useEffect(() => {
    if (hydrated && !isSubscribed && searchParams.get("subscribed") !== "1") {
      router.replace("/results/preview");
    }
  }, [hydrated, isSubscribed, searchParams, router]);

  return (
    <main>
      <TopBar
        back={false}
        title={t("results.title")}
        action={
          <button
            onClick={() => setMethodOpen(true)}
            className="flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-cream"
          >
            <Info className="size-3.5" aria-hidden />
            {t("results.howToRead")}
          </button>
        }
      />

      {empty && (
        <div className="mt-8">
          <NothingYet empty={empty} title={t("results.emptyTitle")} />
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
          {/* The count is real, not a constant: an analysis that came back with
              two opportunities must not claim three. */}
          <p className="mt-7 max-w-md text-[15px] leading-relaxed text-muted">
            {t("results.foundChanges", { count: data.opportunities.length })}
          </p>

          {/* ——— the one thing to do first */}
          <Card tone="linen" className="mt-6 flex flex-col-reverse overflow-hidden lg:flex-row lg:items-stretch">
            <div className="p-6 lg:flex-1 lg:p-8">
              <p className="font-mono text-[10px] tracking-[0.18em] text-black/45 uppercase">
                {t("results.biggestOpportunity")}
              </p>
              <h2 className="type-display mt-3 text-[clamp(2.4rem,10vw,3.4rem)] leading-[0.95]">
                {data.opportunities[0].title}
              </h2>

              <div className="mt-5 flex items-center gap-3">
                <span className="font-mono text-[13px] font-medium text-black/70">
                  {t("common.impactValue", { value: data.opportunities[0].impact })}
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
                {t("results.seeStyles")}
                <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
              </Link>
            </div>

            <ImageFrame
              src={data.opportunities[0].image}
              alt={t("results.exampleAlt", { title: data.opportunities[0].title })}
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
                  alt={t("results.exampleAlt", { title: op.title })}
                  ratio="aspect-[3/2]"
                  imgClassName={op.imagePosition}
                  overlay={
                    <span className="absolute bottom-3 start-4 rounded-full bg-black/50 px-2.5 py-1.5 font-mono text-[10px] tracking-[0.18em] text-white/90 uppercase backdrop-blur-md">
                      {String(i + 2).padStart(2, "0")} / {String(data.opportunities.length).padStart(2, "0")}
                    </span>
                  }
                />
                <div className="p-5">
                  <h3 className="type-display text-[1.6rem]">{op.title}</h3>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="font-mono text-[12px] text-champagne">
                      {t("common.impactValue", { value: op.impact })}
                    </span>
                    <ImpactMeter value={op.impact} className="flex-1" />
                  </div>
                  <p className="mt-3.5 text-[13.5px] leading-relaxed text-muted">{op.description}</p>
                  <Link
                    href="/improvements"
                    className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-champagne underline-offset-4 hover:underline"
                  >
                    {t("results.whatToDo")}
                    <ArrowUpRight className="size-3.5 rtl:-scale-x-100" aria-hidden />
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          {/* ——— where things stand */}
          <section className="mt-10">
            <SectionHeader
              eyebrow={t("results.today")}
              title={t("results.whereYouStand")}
              action={
                <Link href="/improvements" className="text-[13px] text-champagne">
                  {t("results.startHere")}
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
                    <p className="eyebrow mt-1.5 text-[9px]">{t("results.opportunityLabel")}</p>
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
                  <p className="text-[15px] font-medium">{t("results.makeupCard")}</p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {t("results.makeupCardBody", {
                      undertone: t(`makeup.undertone.${data.makeup.undertone}`),
                      count: data.makeup.looks.length,
                    })}
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
                  <p className="text-[15px] font-medium">{t("results.beardCard")}</p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {data.beard.verdict === "clean-shaven"
                      ? t("results.beardCleanShaven")
                      : t("results.beardShapes", { count: data.beard.styles.length })}
                  </p>
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-faint rtl:-scale-x-100" aria-hidden />
              </Card>
            </Link>
          )}

          {photoUrl && (
            <p className="mt-6 text-[12px] text-faint">
              {t("results.basedOnPhoto")}
            </p>
          )}

          <div className="mt-8 mb-4">
            <ButtonLink href="/improvements" fullWidth>
              {t("results.seeTopThree")}
              <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
            </ButtonLink>
          </div>
        </div>
      )}

      <Sheet
        open={methodOpen}
        onClose={() => setMethodOpen(false)}
        title={t("results.howToRead")}
        description={t("results.methodDescription")}
      >
        <div className="space-y-4 pb-2 text-[13.5px] leading-relaxed text-muted">
          <p>
            <span className="text-cream">{t("results.methodImpactWord")}</span>{" "}
            {t("results.methodImpact")}
          </p>
          <p>
            <span className="text-cream">{t("results.methodOpportunityWord")}</span>{" "}
            {t("results.methodOpportunity")}
          </p>
          <p>{t("results.methodDisclaimer")}</p>
        </div>
      </Sheet>
    </main>
  );
}
