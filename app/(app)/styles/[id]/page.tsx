"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Copy, Heart, Scissors, Timer } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState, NothingYet } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { TopBar } from "@/components/app/TopBar";
import { StickyCta } from "@/components/app/StickyCta";
import { CompareSlider } from "@/components/glow/CompareSlider";
import { PreviewPending } from "@/components/glow/PreviewPending";
import { useAsync } from "@/lib/useAsync";
import { useGlow } from "@/lib/state/GlowContext";
import { cachedPreview, getHairstyle, saveStyle } from "@/services/transformationService";
import { stylistWord } from "@/lib/copy";

export default function StyleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { gender, photoUrl, photoKey, savedStyleId, setSavedStyleId } = useGlow();
  const stylist = stylistWord(gender);
  const { data, loading, error, empty, reload } = useAsync(() => getHairstyle(gender, id), [gender, id]);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const saved = savedStyleId === id;

  // Only ever shows a render that already exists — this page doesn't spend an
  // image call on its own; /styles is where previews get generated.
  const [render, setRender] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void cachedPreview(id, photoKey).then((url) => {
      if (!cancelled) setRender(url);
    });
    return () => {
      cancelled = true;
    };
  }, [id, photoKey]);

  async function onSave() {
    if (!data) return;
    setSaving(true);
    try {
      await saveStyle(data.id);
      setSavedStyleId(data.id);
      toast(`${data.name} saved to your plan.`);
    } catch {
      toast("We couldn't save that style. Try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function copyNotes() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(`${data.name} — ${data.barberNotes}`);
      setCopied(true);
      toast("Copied. Show it at the chair.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast("Copying isn't available here. Screenshot it instead.", "info");
    }
  }

  return (
    <main>
      <TopBar title={data?.name ?? "Style"} />

      {empty && (
        <div className="mt-8">
          <NothingYet empty={empty} title="That style needs a scan" />
        </div>
      )}

      {error && (
        <div className="mt-8">
          <ErrorState message={error} onRetry={reload} />
        </div>
      )}

      {loading && !error && !empty && (
        <div className="mt-6 space-y-4">
          <Skeleton className="aspect-[4/5] w-full rounded-card" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!loading && !error && !data && (
        <div className="mt-10">
          <EmptyState
            icon={Scissors}
            title="That style isn't in your matches"
            body="It may have been replaced after a newer analysis."
            action={<ButtonLink href="/styles" size="md">Back to your matches</ButtonLink>}
          />
        </div>
      )}

      {data && (
        <div className="animate-rise lg:grid lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-12">
          <div className="mt-6 lg:sticky lg:top-6">
            {render && photoUrl ? (
              <CompareSlider before={photoUrl} after={render} />
            ) : (
              <PreviewPending
                photo={photoUrl}
                styleName={data.name}
                notes={data.barberNotes}
                stylistWord={stylist}
              />
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-champagne/25 bg-champagne/10 px-3 py-1 font-mono text-[11px] text-champagne">
                {data.match}% match
              </span>
              {data.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-line px-3 py-1 font-mono text-[11px] text-muted"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-10 space-y-6 lg:mt-0">
            <h1 className="type-display text-[clamp(2rem,8vw,2.6rem)]">
              {data.name}
            </h1>

            <section>
              <p className="eyebrow mb-2.5">Why it works</p>
              <p className="text-[15px] leading-relaxed text-cream/90">{data.why}</p>
            </section>

            <Card className="p-5">
              <div className="flex items-start justify-between gap-4">
                <p className="eyebrow">What to tell your {stylist}</p>
                <button
                  onClick={copyNotes}
                  className="flex shrink-0 items-center gap-1.5 text-[12px] text-champagne transition-opacity hover:opacity-80"
                >
                  {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-cream">&ldquo;{data.barberNotes}&rdquo;</p>
            </Card>

            <section className="flex items-center gap-3 rounded-2xl border border-line px-5 py-4">
              <Timer className="size-4 shrink-0 text-champagne" aria-hidden />
              <div>
                <p className="eyebrow mb-1">Maintenance</p>
                <p className="text-[14px] text-cream/90">{data.maintenance}</p>
              </div>
            </section>
          </div>
        </div>
      )}

      {data && (
        <StickyCta>
          <div className="flex gap-3">
            <Button
              fullWidth
              loading={saving}
              variant={saved ? "secondary" : "primary"}
              onClick={onSave}
            >
              {saved ? (
                <>
                  <Check className="size-4" aria-hidden />
                  Saved
                </>
              ) : (
                <>
                  <Heart className="size-4" aria-hidden />
                  Save this style
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              className="shrink-0 px-6 whitespace-nowrap"
              onClick={() => router.push("/styles")}
            >
              Try another
            </Button>
          </div>
        </StickyCta>
      )}
    </main>
  );
}
