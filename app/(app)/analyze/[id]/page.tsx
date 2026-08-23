"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowUpRight,
  CalendarCheck,
  Camera,
  Check,
  ChevronRight,
  Copy,
  FileText,
  History,
  Palette,
  ScanFace,
  Scissors,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { ImpactMeter, ProgressRing } from "@/components/ui/ProgressRing";
import { Sheet } from "@/components/ui/Sheet";
import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { TopBar } from "@/components/app/TopBar";
import { useAsync } from "@/lib/useAsync";
import { useGlow } from "@/lib/state/GlowContext";
import { useT } from "@/lib/i18n/I18nContext";
import { stylistWord } from "@/lib/copy";
import { getAnalyses, getAnalysisById, scanDateLabel } from "@/services/analysisService";
import type { BeardStyle, Hairstyle, Opportunity } from "@/lib/types";

/**
 * One analysis from the history list. It reads the stored document rather than
 * the newest one, so an older scan shows what it actually said on the day and
 * nothing here re-runs the model or spends a call.
 *
 * Everything the analysis captured is reachable from this page — the steps
 * behind each change, the notes behind each cut, the shade guidance — because
 * it's all in the document already. The onward links go to the live screens,
 * which always work off the *current* scan; when this isn't the current one,
 * the page says so rather than pretending the two are the same.
 */
export default function ScanDetailPage() {
  const toast = useToast();
  const t = useT();
  const { gender } = useGlow();
  const stylist = stylistWord(t, gender);

  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useAsync(async () => {
    const [analysis, [newest]] = await Promise.all([getAnalysisById(id), getAnalyses(1)]);
    return { analysis, isLatest: Boolean(analysis && newest && newest.id === analysis.id) };
  }, [id]);

  const analysis = data?.analysis ?? null;
  const isLatest = data?.isLatest ?? false;

  const [change, setChange] = useState<Opportunity | null>(null);
  /**
   * Cuts and beard shapes carry the same fields, so one sheet serves both — but
   * they live on different screens, so the sheet has to know which it's showing
   * or its footer sends a beard shape to a hairstyle route that can't load it.
   */
  const [cut, setCut] = useState<{
    style: Hairstyle | BeardStyle;
    kind: "hair" | "beard";
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function copyNotes(style: Hairstyle | BeardStyle) {
    try {
      await navigator.clipboard.writeText(`${style.name} — ${style.barberNotes}`);
      setCopied(true);
      toast(t("common.copiedForChair"));
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast(t("common.copyUnavailable"), "info");
    }
  }

  return (
    <main>
      <TopBar title={t("scanDetail.title")} />

      {error && (
        <div className="mt-8">
          <ErrorState message={error} onRetry={reload} />
        </div>
      )}

      {loading && !error && (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-56 w-full rounded-card" />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {!loading && !error && !analysis && (
        <div className="mt-10">
          <EmptyState
            icon={History}
            title={t("scanDetail.goneTitle")}
            body={t("scanDetail.goneBody")}
            action={
              <ButtonLink href="/analyze" size="md">
                {t("scanDetail.backToHistory")}
              </ButtonLink>
            }
          />
        </div>
      )}

      {analysis && (
        <div className="animate-rise">
          {/* ——— the reading, as it was on the day */}
          <Card className="mt-6 overflow-hidden">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
              {analysis.photo && (
                <ImageFrame
                  src={analysis.photo}
                  alt=""
                  ratio="aspect-square"
                  className="w-24 shrink-0 rounded-2xl sm:w-28"
                  imgClassName="object-[center_20%]"
                  expandable
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="eyebrow">{scanDateLabel(analysis.createdAt)}</p>
                  <span
                    className={
                      isLatest
                        ? "rounded-full border border-champagne/25 bg-champagne/10 px-2.5 py-0.5 font-mono text-[10px] text-champagne"
                        : "rounded-full border border-line px-2.5 py-0.5 font-mono text-[10px] text-faint"
                    }
                  >
                    {t(isLatest ? "scanDetail.current" : "scanDetail.superseded")}
                  </span>
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-cream/90">{analysis.summary}</p>
              </div>
              <ProgressRing value={analysis.overall} size={76} stroke={6} className="shrink-0">
                <span className="type-display text-[1.25rem] text-champagne">
                  {analysis.overall}
                </span>
              </ProgressRing>
            </div>
          </Card>

          {/* ——— area readings */}
          {analysis.scores?.length > 0 && (
            <section className="mt-10">
              <SectionHeader
                eyebrow={t("scanDetail.areaReadings")}
                title={t("scanDetail.whatItLookedAt")}
              />
              <Card className="divide-y divide-line">
                {/* The meter sits under the label rather than beside it: a fixed
                    column for it leaves the narrowest phones wrapping "Overall
                    clean aesthetic" over three lines. */}
                {analysis.scores.map((s) => (
                  <div key={s.key} className="p-4">
                    <div className="flex items-baseline gap-3">
                      <p className="min-w-0 flex-1 text-[14.5px] font-medium">{s.label}</p>
                      <span className="shrink-0 font-mono text-[12px] text-champagne">
                        {s.value}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-muted">{s.note}</p>
                    <ImpactMeter value={s.value} className="mt-3" />
                  </div>
                ))}
              </Card>
            </section>
          )}

          {/* ——— the three changes, each opening its own steps */}
          {analysis.opportunities?.length > 0 && (
            <section className="mt-10">
              <SectionHeader
                eyebrow={t("scanDetail.rankedByImpact")}
                title={t("scanDetail.threeChanges")}
                action={
                  <Link
                    href="/improvements"
                    className="inline-flex items-center gap-1 text-[13px] text-champagne"
                  >
                    {t("scanDetail.currentLink")}
                    <ArrowUpRight className="size-3.5 rtl:-scale-x-100" aria-hidden />
                  </Link>
                }
              />
              <ul className="space-y-3">
                {analysis.opportunities.map((op, i) => (
                  <li key={op.id}>
                    <button
                      onClick={() => setChange(op)}
                      className="group block w-full text-left"
                      aria-label={t("scanDetail.readTheSteps", { title: op.title })}
                    >
                      <Card className="p-5 transition-colors group-hover:border-champagne/35">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="font-mono text-[10px] tracking-[0.18em] text-faint uppercase">
                            {String(i + 1).padStart(2, "0")} / 0{analysis.opportunities.length}
                          </p>
                          <span className="shrink-0 font-mono text-[11px] text-champagne">
                            {t("common.impactValue", { value: op.impact })}
                          </span>
                        </div>
                        <p className="mt-2 text-[15px] font-medium">{op.title}</p>
                        <ImpactMeter value={op.impact} className="mt-3" />
                        <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
                          {op.recommendation}
                        </p>
                        <span className="mt-4 inline-flex items-center gap-1 text-[12.5px] text-champagne">
                          {t("scanDetail.readSteps", { count: op.steps?.length ?? 3 })}
                          <ChevronRight
                            className="size-3.5 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100"
                            aria-hidden
                          />
                        </span>
                      </Card>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ——— cuts matched in the same pass */}
          {analysis.hairstyles && analysis.hairstyles.length > 0 && (
            <section className="mt-10">
              <SectionHeader
                eyebrow={t("scanDetail.matchedThatDay")}
                title={t("scanDetail.cutsSuggested")}
                action={
                  <Link
                    href="/styles"
                    className="inline-flex items-center gap-1 text-[13px] text-champagne"
                  >
                    {t("scanDetail.currentLink")}
                    <ArrowUpRight className="size-3.5 rtl:-scale-x-100" aria-hidden />
                  </Link>
                }
              />
              <Card className="divide-y divide-line">
                {analysis.hairstyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setCut({ style, kind: "hair" })}
                    className="group flex w-full items-center gap-3 p-4 text-start transition-colors hover:bg-raised/50"
                  >
                    <Scissors className="size-4 shrink-0 text-champagne" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-medium">{style.name}</p>
                      <p className="mt-0.5 truncate text-[12.5px] text-muted">
                        {style.maintenance}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-champagne">
                      {style.match}%
                    </span>
                    <ChevronRight
                      className="size-4 shrink-0 text-faint transition-colors group-hover:text-champagne rtl:-scale-x-100"
                      aria-hidden
                    />
                  </button>
                ))}
              </Card>
            </section>
          )}

          {/* ——— facial hair, when this scan read it */}
          {analysis.beard && analysis.beard.styles?.length > 0 && (
            <section className="mt-10">
              <SectionHeader
                eyebrow={t("scanDetail.facialHair")}
                title={t(
                  analysis.beard.verdict === "clean-shaven"
                    ? "scanDetail.saidCleanShaven"
                    : "scanDetail.shapesSuggested",
                )}
                action={
                  <Link
                    href="/beard"
                    className="inline-flex items-center gap-1 text-[13px] text-champagne"
                  >
                    {t("scanDetail.currentLink")}
                    <ArrowUpRight className="size-3.5 rtl:-scale-x-100" aria-hidden />
                  </Link>
                }
              />
              <Card className="p-5">
                <p className="text-[13.5px] leading-relaxed text-cream/90">
                  {analysis.beard.recommendation}
                </p>
                {analysis.beard.growth && (
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                    {analysis.beard.growth}
                  </p>
                )}
              </Card>

              {analysis.beard.verdict === "beard" && (
                <Card className="mt-3 divide-y divide-line">
                  {analysis.beard.styles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setCut({ style, kind: "beard" })}
                      className="group flex w-full items-center gap-3 p-4 text-start transition-colors hover:bg-raised/50"
                    >
                      <Scissors className="size-4 shrink-0 text-champagne" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14.5px] font-medium">{style.name}</p>
                        <p className="mt-0.5 truncate text-[12.5px] text-muted">
                          {style.maintenance}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-champagne">
                        {style.match}%
                      </span>
                      <ChevronRight
                        className="size-4 shrink-0 text-faint transition-colors group-hover:text-champagne rtl:-scale-x-100"
                        aria-hidden
                      />
                    </button>
                  ))}
                </Card>
              )}
            </section>
          )}

          {/* ——— shade guidance, when this scan included it */}
          {analysis.makeup && (
            <section className="mt-10">
              <SectionHeader
                eyebrow={t("scanDetail.colour")}
                title={t("scanDetail.shadesRead")}
                action={
                  <Link
                    href="/makeup"
                    className="inline-flex items-center gap-1 text-[13px] text-champagne"
                  >
                    {t("scanDetail.currentLink")}
                    <ArrowUpRight className="size-3.5 rtl:-scale-x-100" aria-hidden />
                  </Link>
                }
              />
              <Card className="p-5">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-champagne/25 bg-champagne/10 px-3 py-1 font-mono text-[11px] text-champagne">
                    {t("makeup.undertoneChip", {
                      undertone: t(`makeup.undertone.${analysis.makeup.undertone}`),
                    })}
                  </span>
                  {analysis.makeup.depth && (
                    <span className="rounded-full border border-line px-3 py-1 font-mono text-[11px] text-muted">
                      {analysis.makeup.depth}
                    </span>
                  )}
                  {analysis.makeup.season && (
                    <span className="rounded-full border border-line px-3 py-1 font-mono text-[11px] text-muted">
                      {analysis.makeup.season}
                    </span>
                  )}
                </div>

                <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
                  {analysis.makeup.summary}
                </p>

                {/* Stored documents predate some of these arrays, so each is
                    read defensively rather than spread blind. */}
                <div className="mt-5 flex flex-wrap gap-2">
                  {[
                    ...(analysis.makeup.base ?? []),
                    ...(analysis.makeup.cheek ?? []),
                    ...(analysis.makeup.lip ?? []),
                    ...(analysis.makeup.eye ?? []),
                  ].map((shade) => (
                    <span
                      key={`${shade.name}-${shade.hex}`}
                      className="flex items-center gap-2 rounded-full border border-line py-1 pr-3 pl-1"
                      title={shade.note}
                    >
                      <span
                        className="size-5 shrink-0 rounded-full border border-cream/10"
                        style={{ backgroundColor: shade.hex }}
                        aria-hidden
                      />
                      <span className="text-[12px] text-cream/85">{shade.name}</span>
                    </span>
                  ))}
                </div>

                {(analysis.makeup.looks?.length ?? 0) > 0 && (
                  <ul className="mt-5 space-y-2 border-t border-line pt-4">
                    {analysis.makeup.looks.map((look) => (
                      <li
                        key={look.id}
                        className="flex items-center gap-3 text-[13.5px] text-cream/90"
                      >
                        <Palette className="size-3.5 shrink-0 text-champagne" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{look.name}</span>
                        <span className="shrink-0 font-mono text-[11px] text-faint">
                          {t("common.minutes", { count: look.minutes })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>
          )}

          {/* ——— where to go from here */}
          <section className="mt-10 mb-2">
            <SectionHeader eyebrow={t("scanDetail.goTo")} title={t("scanDetail.takeItFurther")} />

            <p className="mb-4 -mt-1 text-[12.5px] leading-relaxed text-muted">
              {t(isLatest ? "scanDetail.builtFromThis" : "scanDetail.builtFromLatest")}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {([
                {
                  icon: FileText,
                  href: "/results",
                  label: t("scanDetail.fullReport"),
                  body: t("scanDetail.fullReportBody"),
                },
                {
                  icon: Sparkles,
                  href: "/improvements",
                  label: t("scanDetail.theThreeChanges"),
                  body: t("scanDetail.theThreeChangesBody"),
                },
                {
                  icon: Scissors,
                  href: "/styles",
                  label: t("scanDetail.hairstyles"),
                  body: t("scanDetail.hairstylesBody"),
                },
                ...(analysis.beard
                  ? [
                      {
                        icon: ScanFace,
                        href: "/beard",
                        label: t("scanDetail.facialHair"),
                        body: t("scanDetail.facialHairBody"),
                      },
                    ]
                  : []),
                ...(analysis.makeup
                  ? [
                      {
                        icon: Palette,
                        href: "/makeup",
                        label: t("scanDetail.makeup"),
                        body: t("scanDetail.makeupBody"),
                      },
                    ]
                  : []),
                {
                  icon: CalendarCheck,
                  href: "/plan",
                  label: t("scanDetail.yourPlan"),
                  body: t("scanDetail.yourPlanBody"),
                },
                {
                  icon: TrendingUp,
                  href: "/progress",
                  label: t("scanDetail.compareProgress"),
                  body: t("scanDetail.compareProgressBody"),
                },
                {
                  icon: Camera,
                  href: "/upload",
                  label: t("scanDetail.newAnalysis"),
                  body: t("scanDetail.newAnalysisBody"),
                },
              ] as { icon: LucideIcon; href: string; label: string; body: string }[]).map(
                ({ icon: Icon, href, label, body }) => (
                  <Link key={href} href={href} className="group">
                    <Card className="h-full p-4 transition-colors group-hover:border-champagne/35 sm:p-5">
                      <span className="mb-3 grid size-9 place-items-center rounded-xl bg-raised text-champagne sm:size-10">
                        <Icon className="size-[17px]" aria-hidden />
                      </span>
                      <p className="text-[14px] font-medium sm:text-[15px]">{label}</p>
                      <p className="mt-1 text-[12px] leading-snug text-muted">{body}</p>
                    </Card>
                  </Link>
                ),
              )}
            </div>
          </section>

          <p className="mt-8 mb-2 text-[11.5px] leading-relaxed text-faint">
            {t("scanDetail.keptAsItWas", { date: scanDateLabel(analysis.createdAt) })}
            {!isLatest && t("scanDetail.latestNote")}
          </p>
        </div>
      )}

      {/* ——— one change, in full */}
      <Sheet
        open={Boolean(change)}
        onClose={() => setChange(null)}
        title={change?.title ?? ""}
        description={
          change
            ? t("scanDetail.changeDescription", {
                impact: change.impact,
                headline: change.headline,
              })
            : undefined
        }
        footer={
          change ? (
            <ButtonLink
              href={change.area === "hair" ? "/styles" : "/plan"}
              fullWidth
              onClick={() => setChange(null)}
            >
              {change.area === "hair" ? (
                <>
                  <Sparkles className="size-4" aria-hidden />
                  {t("scanDetail.previewCuts")}
                </>
              ) : (
                <>
                  <CalendarCheck className="size-4" aria-hidden />
                  {t("scanDetail.seeItInPlan")}
                </>
              )}
            </ButtonLink>
          ) : undefined
        }
      >
        {change && (
          <div className="space-y-6 pb-2">
            <div>
              <p className="eyebrow mb-2">{t("scanDetail.whatItSaw")}</p>
              <p className="text-[14px] leading-relaxed text-muted">{change.description}</p>
            </div>
            <div>
              <p className="eyebrow mb-2">{t("scanDetail.whyThisWorks")}</p>
              <p className="text-[14px] leading-relaxed text-muted">{change.why}</p>
            </div>
            {change.steps?.length > 0 && (
              <div>
                <p className="eyebrow mb-3">{t("scanDetail.whatToActuallyDo")}</p>
                <ul className="space-y-2.5">
                  {change.steps.map((s, i) => (
                    <li key={s} className="flex gap-3 text-[14px] leading-relaxed text-cream/90">
                      <span className="mt-0.5 font-mono text-[11px] text-champagne">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {change.disclaimer && (
              <p className="flex items-start gap-2 rounded-2xl border border-line bg-raised px-4 py-3 text-[12px] leading-relaxed text-faint">
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {change.disclaimer}
              </p>
            )}
          </div>
        )}
      </Sheet>

      {/* ——— one cut, in full */}
      <Sheet
        open={Boolean(cut)}
        onClose={() => setCut(null)}
        title={cut?.style.name ?? ""}
        description={
          cut
            ? t("scanDetail.cutDescription", {
                match: cut.style.match,
                maintenance: cut.style.maintenance,
              })
            : undefined
        }
        footer={
          cut && isLatest ? (
            <ButtonLink
              href={cut.kind === "beard" ? "/beard" : `/styles/${cut.style.id}`}
              fullWidth
              onClick={() => setCut(null)}
            >
              <Sparkles className="size-4" aria-hidden />
              {t("scanDetail.seeItOnMyFace")}
            </ButtonLink>
          ) : undefined
        }
      >
        {cut && (
          <div className="space-y-6 pb-2">
            <div>
              <p className="eyebrow mb-2">{t("scanDetail.whyItSuits")}</p>
              <p className="text-[14px] leading-relaxed text-muted">{cut.style.why}</p>
            </div>
            <div>
              <div className="mb-2 flex items-start justify-between gap-4">
                <p className="eyebrow">{t("scanDetail.tellYourStylist", { stylist })}</p>
                <button
                  onClick={() => copyNotes(cut.style)}
                  className="flex shrink-0 items-center gap-1.5 text-[12px] text-champagne transition-opacity hover:opacity-80"
                >
                  {copied ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : (
                    <Copy className="size-3.5" aria-hidden />
                  )}
                  {copied ? t("common.copied") : t("common.copy")}
                </button>
              </div>
              <p className="text-[14px] leading-relaxed text-cream/90">
                &ldquo;{cut.style.barberNotes}&rdquo;
              </p>
            </div>
            {cut.style.blurb && (
              <div>
                <p className="eyebrow mb-2">{t("scanDetail.upkeep")}</p>
                <p className="text-[14px] leading-relaxed text-muted">{cut.style.blurb}</p>
              </div>
            )}
            {cut.style.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {cut.style.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-line px-3 py-1 font-mono text-[11px] text-muted"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            {!isLatest && (
              <p className="rounded-2xl border border-line bg-raised px-4 py-3 text-[12px] leading-relaxed text-faint">
                {t("scanDetail.cantRenderHere")}
              </p>
            )}
          </div>
        )}
      </Sheet>
    </main>
  );
}
