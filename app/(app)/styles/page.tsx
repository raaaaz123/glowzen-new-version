"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Heart,
  Image as ImageIcon,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState, NothingYet } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { TopBar } from "@/components/app/TopBar";
import { CompareSlider } from "@/components/glow/CompareSlider";
import { PreviewPending } from "@/components/glow/PreviewPending";
import { useAsync } from "@/lib/useAsync";
import { useGlow } from "@/lib/state/GlowContext";
import { stylistWord } from "@/lib/copy";
import {
  generatePreview,
  getHairstyles,
  savedPreviewIds,
  saveStyle,
} from "@/services/transformationService";
import type { TransformationResult } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function StylesPage() {
  const toast = useToast();
  const { gender, photoUrl, photoKey, hydrated, savedStyleId, setSavedStyleId } = useGlow();
  const { data: styles, loading, error, empty, reload } = useAsync(() => getHairstyles(gender), [gender]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [preview, setPreview] = useState<TransformationResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Which cuts have a render already stored for this photo. Those cost nothing
  // to look at again, and the button says so rather than making the user find
  // out by tapping.
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

  const stylist = stylistWord(gender);

  const run = useCallback(
    async (styleId: string) => {
      setActiveId(styleId);
      setGenerating(true);
      setPreviewError(null);
      try {
        setPreview(await generatePreview(gender, styleId, photoKey));
        // It's stored now, so coming back to it later is free.
        setSaved((prev) => (prev.has(styleId) ? prev : new Set(prev).add(styleId)));
      } catch (e) {
        setPreviewError(e instanceof Error ? e.message : "That preview didn't render.");
      } finally {
        setGenerating(false);
      }
    },
    [gender, photoKey],
  );

  // Lead with the strongest match so the screen is never empty. Waits for
  // hydration so the render isn't attempted before photoKey is known.
  useEffect(() => {
    if (hydrated && styles?.length && !activeId) void run(styles[0].id);
  }, [hydrated, styles, activeId, run]);

  const active = styles?.find((s) => s.id === activeId) ?? null;

  async function onFavourite() {
    if (!active) return;
    setSaving(true);
    try {
      await saveStyle(active.id);
      setSavedStyleId(active.id);
      toast(`${active.name} saved to your plan.`);
    } catch {
      toast("We couldn't save that style. Try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <TopBar title="Find your best hairstyle" />

      <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted">
        Drag the line to see the change on your own photo before you commit to it.
      </p>

      <div className="lg:mt-6 lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-10">
        {/* ——— preview */}
        <div className="mt-6 lg:sticky lg:top-6 lg:mt-0">
          {previewError && <ErrorState message={previewError} onRetry={() => activeId && run(activeId)} />}

          {!previewError && generating && (
            <div className="relative">
              <Skeleton className="aspect-[4/5] w-full rounded-card" />
              <div className="absolute inset-0 grid place-items-center">
                <div className="flex items-center gap-2.5 rounded-full bg-ink/70 px-4 py-2.5 text-[13px] backdrop-blur-md">
                  <Loader2 className="size-3.5 animate-spin text-champagne" aria-hidden />
                  Rendering your preview…
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
                  styleName={active?.name ?? "this style"}
                  notes={active?.barberNotes ?? ""}
                  stylistWord={stylist}
                />
              )}
              <div className="mt-4 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <p className="font-mono text-[11px] tracking-[0.1em] text-faint uppercase">
                  {preview.caption}
                </p>
                {active && (
                  <Link
                    href={`/styles/${active.id}`}
                    className="inline-flex items-center gap-1.5 text-[13px] text-champagne underline-offset-4 hover:underline"
                  >
                    Full details
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </Link>
                )}
              </div>

              <Button
                fullWidth
                className="mt-4"
                loading={saving}
                variant={savedStyleId === active?.id ? "secondary" : "primary"}
                onClick={onFavourite}
              >
                {savedStyleId === active?.id ? (
                  <>
                    <Check className="size-4" aria-hidden />
                    Saved to your plan
                  </>
                ) : (
                  <>
                    <Heart className="size-4" aria-hidden />
                    This is my favorite
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* ——— options */}
        <div className="mt-10 lg:mt-0">
          <p className="eyebrow mb-4">Three shapes matched to your face</p>

          {empty && <NothingYet empty={empty} title="Your matches land here" />}

          {error && <ErrorState message={error} onRetry={reload} />}

          {loading && !error && !empty && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-card" />
              ))}
            </div>
          )}

          <div className="space-y-3">
            {styles?.map((style) => {
              const isActive = style.id === activeId;
              const isSaved = saved.has(style.id);
              return (
                <Card
                  key={style.id}
                  className={cn(
                    "overflow-hidden transition-colors duration-200",
                    isActive && "border-champagne/50 bg-champagne/6",
                  )}
                >
                  <div className="flex gap-4 p-3">
                    {style.image ? (
                      <ImageFrame
                        src={style.image}
                        alt={style.name}
                        ratio="aspect-square"
                        className="w-24 shrink-0 rounded-2xl"
                        imgClassName="object-[center_18%]"
                      />
                    ) : (
                      <div className="grid aspect-square w-24 shrink-0 place-items-center rounded-2xl border border-line bg-raised text-center">
                        <div>
                          <p className="type-display text-[1.5rem] text-champagne">{style.match}</p>
                          <p className="eyebrow mt-0.5 text-[8px]">Match</p>
                        </div>
                      </div>
                    )}
                    <div className="min-w-0 flex-1 py-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[15px] font-medium tracking-[-0.01em]">{style.name}</h3>
                        <span className="shrink-0 font-mono text-[11px] text-champagne">
                          {style.match}%
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13px] leading-snug text-muted">{style.blurb}</p>

                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={isActive ? "quiet" : "secondary"}
                          onClick={() => run(style.id)}
                          disabled={generating && isActive}
                        >
                          {isActive && !generating ? (
                            <>
                              <Check className="size-3.5" aria-hidden />
                              Showing
                            </>
                          ) : isSaved ? (
                            <>
                              <ImageIcon className="size-3.5" aria-hidden />
                              View saved
                            </>
                          ) : (
                            <>
                              <Sparkles className="size-3.5" aria-hidden />
                              Preview
                            </>
                          )}
                        </Button>
                        <Link
                          href={`/styles/${style.id}`}
                          className="text-[12.5px] text-muted underline-offset-4 hover:text-cream hover:underline"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <p className="mt-5 text-[11.5px] leading-relaxed text-faint">
            Previews are illustrative. Bring the detail page to your {stylist} — the
            notes matter more than the picture.
          </p>
        </div>
      </div>
    </main>
  );
}
