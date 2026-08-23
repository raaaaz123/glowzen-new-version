"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Image as ImageIcon, Loader2, Sparkles, Timer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState, NothingYet } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { TopBar } from "@/components/app/TopBar";
import { Paywall, PaywallPrompt } from "@/components/app/Paywall";
import { CompareSlider } from "@/components/glow/CompareSlider";
import { PreviewPending } from "@/components/glow/PreviewPending";
import { useAsync } from "@/lib/useAsync";
import { useGlow } from "@/lib/state/GlowContext";
import { useT } from "@/lib/i18n/I18nContext";
import { stylistWord } from "@/lib/copy";
import { getBeard } from "@/services/analysisService";
import { generateBeardPreview, savedPreviewIds } from "@/services/transformationService";
import type { TransformationResult } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Facial hair, read from the same pass as everything else.
 *
 * The verdict leads. A clean shave is a real recommendation here, not the empty
 * state — when it's the answer there is exactly one look, and it still renders
 * on the user's own face, because "you'd look better without it" is much easier
 * to believe when you can see it.
 */
export default function BeardPage() {
  const toast = useToast();
  const t = useT();
  const { gender, photoUrl, photoKey, hydrated, isSubscribed } = useGlow();
  const { data: beard, loading, error, empty, reload } = useAsync(() => getBeard(gender), [gender]);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const stylist = stylistWord(t, gender);
  const cleanShaven = beard?.verdict === "clean-shaven";

  const [activeId, setActiveId] = useState<string | null>(null);
  const [preview, setPreview] = useState<TransformationResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Shapes with a render already stored for this photo cost nothing to re-open.
  const [saved, setSaved] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    void savedPreviewIds(photoKey).then((ids) => {
      if (!cancelled) setSaved(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, photoKey]);

  const run = useCallback(
    async (styleId: string) => {
      setActiveId(styleId);
      setGenerating(true);
      setPreviewError(null);
      try {
        setPreview(await generateBeardPreview(gender, styleId, photoKey));
        setSaved((prev) => (prev.has(styleId) ? prev : new Set(prev).add(styleId)));
      } catch (e) {
        setPreviewError(e instanceof Error ? e.message : t("styles.renderFailed"));
      } finally {
        setGenerating(false);
      }
    },
    [gender, photoKey, t],
  );

  // Lead with the strongest match so the screen is never empty. Waits for
  // hydration so the render isn't attempted before photoKey is known.
  useEffect(() => {
    if (hydrated && beard?.styles.length && !activeId) void run(beard.styles[0].id);
  }, [hydrated, beard, activeId, run]);

  const active = beard?.styles.find((s) => s.id === activeId) ?? null;

  async function copyNotes() {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(`${active.name} — ${active.barberNotes}`);
      setCopied(true);
      toast(t("common.copiedForChair"));
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast(t("common.copyUnavailable"), "info");
    }
  }

  return (
    <main>
      <TopBar title={t("beard.title")} />

      {!isSubscribed && (
        <>
          <PaywallPrompt
            onOpen={() => setPaywallOpen(true)}
            message={t("paywall.lockedBeard")}
          />
          <Paywall open={paywallOpen} onClose={() => setPaywallOpen(false)} />
        </>
      )}

      {isSubscribed && (
      <>
      {empty && (
        <div className="mt-8">
          <NothingYet empty={empty} title={t("beard.emptyTitle")} />
        </div>
      )}

      {error && (
        <div className="mt-8">
          <ErrorState message={error} onRetry={reload} />
        </div>
      )}

      {loading && !error && !empty && (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-40 w-full rounded-card" />
          <Skeleton className="aspect-[4/5] w-full rounded-card" />
        </div>
      )}

      {beard && (
        <div className="animate-rise">
          {/* ——— the verdict, before anything else */}
          <Card tone="linen" className="mt-6 p-5 sm:p-6">
            <p className="font-mono text-[10px] tracking-[0.18em] text-black/45 uppercase">
              {t(cleanShaven ? "beard.verdict" : "beard.matchedToJaw")}
            </p>
            <h1 className="type-display mt-3 text-[clamp(1.8rem,7vw,2.4rem)] leading-[1.05]">
              {t(cleanShaven ? "beard.cleanShavenTitle" : "beard.beardWorksTitle")}
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-black/65">{beard.summary}</p>
            <p className="mt-3 text-[14px] leading-relaxed text-black/75">
              {beard.recommendation}
            </p>
            {beard.growth && (
              <p className="mt-4 border-t border-black/10 pt-4 font-mono text-[11px] leading-relaxed text-black/50">
                {beard.growth}
              </p>
            )}
          </Card>

          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted">
            {t(cleanShaven ? "beard.introCleanShaven" : "beard.introBeard")}
          </p>

          <div className="lg:mt-6 lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-10">
            {/* ——— preview */}
            <div className="mt-6 lg:sticky lg:top-6 lg:mt-0">
              {previewError && (
                <ErrorState message={previewError} onRetry={() => activeId && run(activeId)} />
              )}

              {!previewError && generating && (
                <div className="relative">
                  <Skeleton className="aspect-[4/5] w-full rounded-card" />
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="flex items-center gap-2.5 rounded-full bg-ink/70 px-4 py-2.5 text-[13px] backdrop-blur-md">
                      <Loader2 className="size-3.5 animate-spin text-champagne" aria-hidden />
                      {t("styles.rendering")}
                    </div>
                  </div>
                </div>
              )}

              {!previewError && !generating && preview && (
                <div className="animate-fade">
                  {preview.after && photoUrl ? (
                    <CompareSlider before={photoUrl} after={preview.after} />
                  ) : (
                    <PreviewPending
                      photo={photoUrl}
                      styleName={active?.name ?? t("beard.thisShape")}
                      notes={active?.barberNotes ?? ""}
                      stylistWord={stylist}
                    />
                  )}
                  <p className="mt-4 font-mono text-[11px] tracking-[0.1em] text-faint uppercase">
                    {preview.caption}
                  </p>
                </div>
              )}
            </div>

            {/* ——— the shapes */}
            <div className="mt-10 lg:mt-0">
              <p className="eyebrow mb-4">
                {cleanShaven
                  ? t("beard.whatToAskFor")
                  : t("beard.shapesMatched", { count: beard.styles.length })}
              </p>

              <div className="space-y-3">
                {beard.styles.map((style) => {
                  const isActive = style.id === activeId;
                  const isSaved = saved.has(style.id);
                  return (
                    <Card
                      key={style.id}
                      className={cn(
                        "p-4 transition-colors duration-200",
                        isActive && "border-champagne/50 bg-champagne/6",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-[15px] font-medium tracking-[-0.01em]">
                          {style.name}
                        </h2>
                        {!cleanShaven && (
                          <span className="shrink-0 font-mono text-[11px] text-champagne">
                            {style.match}%
                          </span>
                        )}
                      </div>

                      <p className="mt-1.5 text-[13px] leading-snug text-muted">{style.blurb}</p>
                      <p className="mt-2.5 text-[13.5px] leading-relaxed text-cream/85">
                        {style.why}
                      </p>

                      <div className="mt-3 flex items-center gap-2 text-[12.5px] text-muted">
                        <Timer className="size-3.5 shrink-0 text-champagne" aria-hidden />
                        {style.maintenance}
                      </div>

                      {style.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {style.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[10.5px] text-muted"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      <Button
                        size="sm"
                        className="mt-4"
                        variant={isActive ? "quiet" : "secondary"}
                        onClick={() => run(style.id)}
                        disabled={generating && isActive}
                      >
                        {isActive && !generating ? (
                          <>
                            <Check className="size-3.5" aria-hidden />
                            {t("styles.showing")}
                          </>
                        ) : isSaved ? (
                          <>
                            <ImageIcon className="size-3.5" aria-hidden />
                            {t("styles.viewSaved")}
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-3.5" aria-hidden />
                            {t("styles.preview")}
                          </>
                        )}
                      </Button>
                    </Card>
                  );
                })}
              </div>

              {/* ——— what to say at the chair */}
              {active && (
                <Card className="mt-6 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <p className="eyebrow">{t("beard.tellYourStylist", { stylist })}</p>
                    <button
                      onClick={copyNotes}
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
                  <p className="mt-3 text-[15px] leading-relaxed text-cream">
                    &ldquo;{active.barberNotes}&rdquo;
                  </p>
                </Card>
              )}

              <p className="mt-5 mb-2 text-[11.5px] leading-relaxed text-faint">
                {t("beard.previewsNote", { stylist })}
              </p>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </main>
  );
}
