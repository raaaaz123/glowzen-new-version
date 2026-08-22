"use client";

import { useEffect, useState } from "react";
import { Clock, Loader2, Palette, Sparkles, X } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { ImpactMeter } from "@/components/ui/ProgressRing";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState, NothingYet } from "@/components/ui/States";
import { TopBar } from "@/components/app/TopBar";
import { PreviewPending } from "@/components/glow/PreviewPending";
import { useAsync } from "@/lib/useAsync";
import { useGlow } from "@/lib/state/GlowContext";
import { getMakeup } from "@/services/analysisService";
import { cachedPreview, generateMakeupPreview } from "@/services/transformationService";
import { Button } from "@/components/ui/Button";
import type { MakeupLook, Shade } from "@/lib/types";

const UNDERTONE_COPY: Record<string, string> = {
  warm: "Golden, peachy or yellow cast",
  cool: "Pink, red or blue cast",
  neutral: "No strong cast either way",
  olive: "Green cast — most bases run too pink",
};

export default function MakeupPage() {
  const { gender, photoUrl, photoKey } = useGlow();
  const { data, loading, error, empty, reload } = useAsync(() => getMakeup(gender), [gender]);
  const [look, setLook] = useState<MakeupLook | null>(null);

  // Rendered on the user's own face. Shown from cache if it exists; generating
  // one is an explicit tap, because each render is a paid image call.
  const [render, setRender] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    setRender(null);
    setRenderError(null);
    if (!look) return;
    let cancelled = false;
    void cachedPreview(look.id, photoKey).then((url) => {
      if (!cancelled) setRender(url);
    });
    return () => {
      cancelled = true;
    };
  }, [look, photoKey]);

  async function renderLook() {
    if (!look) return;
    setRendering(true);
    setRenderError(null);
    try {
      setRender(await generateMakeupPreview(look, photoKey));
    } catch (e) {
      setRenderError(e instanceof Error ? e.message : "That preview didn't render.");
    } finally {
      setRendering(false);
    }
  }

  return (
    <main>
      <TopBar title="Your makeup" />

      {empty && (
        <div className="mt-8">
          <NothingYet empty={empty} title="Your shades land here" />
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
          <Skeleton className="h-56 w-full rounded-card" />
        </div>
      )}

      {!loading && !error && !data && (
        <div className="mt-10">
          <EmptyState
            icon={Palette}
            title="No shade reading yet"
            body="Run an analysis and we'll read your undertone from the photo, then match shades to it."
            action={
              <ButtonLink href="/upload" size="md">
                Start an analysis
              </ButtonLink>
            }
          />
        </div>
      )}

      {data && (
        <div className="animate-rise">
          {/* ——— the reading */}
          <Card tone="linen" className="mt-6 p-6">
            <p className="font-mono text-[10px] tracking-[0.18em] text-black/45 uppercase">
              Your undertone
            </p>
            <h2 className="type-display mt-3 text-[clamp(2rem,9vw,2.8rem)] capitalize">
              {data.undertone}
            </h2>
            <p className="mt-2 text-[13px] text-black/55">{UNDERTONE_COPY[data.undertone]}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Pill>{data.depth}</Pill>
              {data.season && <Pill>{data.season}</Pill>}
            </div>

            <p className="mt-5 text-[14.5px] leading-relaxed text-black/70">{data.summary}</p>
          </Card>

          {/* ——— shades */}
          <section className="mt-10">
            <SectionHeader eyebrow="Matched to your undertone" title="Your shades" />
            <div className="space-y-3">
              <ShadeRow label="Base" shades={data.base} />
              <ShadeRow label="Cheek" shades={data.cheek} />
              <ShadeRow label="Lip" shades={data.lip} />
              <ShadeRow label="Eye" shades={data.eye} />
            </div>
            <p className="mt-4 flex items-start gap-2 text-[11.5px] leading-relaxed text-faint">
              <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Screen colour is a starting point, not a match. Phone cameras shift colour, so test
              base shades along your jaw in daylight before buying.
            </p>
          </section>

          {/* ——— what to skip */}
          <section className="mt-10">
            <SectionHeader eyebrow="Save your money" title="What to skip" />
            <Card className="divide-y divide-line">
              {data.avoid.map((a) => (
                <div key={a.label} className="flex items-start gap-3 px-5 py-4">
                  <X className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
                  <div>
                    <p className="text-[14.5px]">{a.label}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{a.reason}</p>
                  </div>
                </div>
              ))}
            </Card>
          </section>

          {/* ——— looks */}
          <section className="mt-10 mb-2">
            <SectionHeader eyebrow="Ranked by how well they suit you" title="Looks to try" />
            <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              {data.looks.map((l) => (
                <button key={l.id} onClick={() => setLook(l)} className="w-full text-left">
                  <Card className="h-full p-5 transition-colors hover:border-champagne/35">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="type-display text-[1.5rem]">{l.name}</h3>
                      <span className="shrink-0 font-mono text-[11px] text-champagne">
                        {l.match}%
                      </span>
                    </div>

                    <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{l.blurb}</p>

                    <div className="mt-4 flex items-center gap-3">
                      <span className="flex items-center gap-1.5 font-mono text-[11px] text-faint">
                        <Clock className="size-3" aria-hidden />
                        {l.minutes} min
                      </span>
                      <ImpactMeter value={l.match} className="flex-1" />
                    </div>

                    <div className="mt-4 flex gap-1.5">
                      {l.shades.map((sh) => (
                        <span
                          key={sh.name}
                          className="size-7 rounded-full border border-cream/10"
                          style={{ backgroundColor: sh.hex }}
                          title={sh.name}
                        />
                      ))}
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      <Sheet
        open={Boolean(look)}
        onClose={() => setLook(null)}
        title={look?.name ?? ""}
        description={look ? `${look.match}% match · about ${look.minutes} minutes` : undefined}
      >
        {look && (
          <div className="space-y-6 pb-2">
            {render ? (
              <img src={render} alt={look.name} className="w-full rounded-card" />
            ) : (
              <div>
                <PreviewPending
                  photo={photoUrl}
                  styleName={look.name}
                  notes={look.steps[0] ?? ""}
                  stylistWord="makeup artist"
                />
                {photoKey && (
                  <Button
                    fullWidth
                    variant="secondary"
                    className="mt-3"
                    loading={rendering}
                    onClick={renderLook}
                  >
                    {rendering ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        Rendering on your photo…
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" aria-hidden />
                        See it on my face
                      </>
                    )}
                  </Button>
                )}
                {renderError && (
                  <p className="mt-2 text-[13px] text-danger-soft">{renderError}</p>
                )}
              </div>
            )}

            <div>
              <p className="eyebrow mb-2">Why it works</p>
              <p className="text-[14px] leading-relaxed text-muted">{look.why}</p>
            </div>

            <div>
              <p className="eyebrow mb-3">Shades</p>
              <div className="space-y-2">
                {look.shades.map((sh) => (
                  <ShadeChip key={sh.name} shade={sh} />
                ))}
              </div>
            </div>

            <div>
              <p className="eyebrow mb-3">How to do it</p>
              <ul className="space-y-2.5">
                {look.steps.map((step, i) => (
                  <li key={step} className="flex gap-3 text-[14px] leading-relaxed text-cream/90">
                    <span className="mt-0.5 font-mono text-[11px] text-champagne">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="eyebrow mb-3">What to buy</p>
              <div className="space-y-2">
                {look.products.map((prod) => (
                  <div key={prod.type} className="rounded-2xl border border-line bg-raised px-4 py-3">
                    <p className="text-[14px]">{prod.type}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{prod.lookFor}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11.5px] leading-relaxed text-faint">
                Categories and shades, not brands — we can&apos;t verify a specific product matches
                your skin, and a wrong base is a wasted purchase.
              </p>
            </div>
          </div>
        )}
      </Sheet>
    </main>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-black/15 px-3 py-1 font-mono text-[11px] text-black/60">
      {children}
    </span>
  );
}

function ShadeRow({ label, shades }: { label: string; shades: Shade[] }) {
  return (
    <Card className="p-4">
      <p className="eyebrow mb-3">{label}</p>
      <div className="space-y-2.5">
        {shades.map((s) => (
          <ShadeChip key={s.name} shade={s} />
        ))}
      </div>
    </Card>
  );
}

function ShadeChip({ shade }: { shade: Shade }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="size-9 shrink-0 rounded-xl border border-cream/10"
        style={{ backgroundColor: shade.hex }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-[14px]">{shade.name}</p>
        <p className="text-[12px] text-muted">{shade.note}</p>
      </div>
      <span className="shrink-0 font-mono text-[10px] text-faint uppercase">{shade.hex}</span>
    </div>
  );
}
