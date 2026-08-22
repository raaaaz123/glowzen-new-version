"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { ImpactMeter } from "@/components/ui/ProgressRing";
import { Sheet } from "@/components/ui/Sheet";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, NothingYet } from "@/components/ui/States";
import { TopBar } from "@/components/app/TopBar";
import { useAsync } from "@/lib/useAsync";
import { useGlow } from "@/lib/state/GlowContext";
import { getAnalysis } from "@/services/analysisService";
import type { Opportunity } from "@/lib/types";

export default function ImprovementsPage() {
  const router = useRouter();
  const { gender } = useGlow();
  const { data, loading, error, empty, reload } = useAsync(() => getAnalysis(gender), [gender]);
  const [detail, setDetail] = useState<Opportunity | null>(null);

  return (
    <main>
      <TopBar title="Start here" />

      <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted">
        You don&apos;t need to change everything. These three are ordered by how much difference
        they&apos;d make.
      </p>

      {empty && (
        <div className="mt-8">
          <NothingYet empty={empty} title="Your improvements land here" />
        </div>
      )}

      {error && (
        <div className="mt-6">
          <ErrorState message={error} onRetry={reload} />
        </div>
      )}

      {loading && !error && !empty && (
        <div className="mt-6 space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {data && (
        <ol className="animate-rise mt-6 space-y-4">
          {data.opportunities.map((op, i) => (
            <li key={op.id}>
              <Card className="overflow-hidden">
                <div className="sm:flex">
                  <ImageFrame
                    src={op.image}
                    alt={`${op.title} example`}
                    ratio="aspect-[3/2] sm:aspect-auto"
                    className="sm:w-40 sm:shrink-0"
                    imgClassName={op.imagePosition}
                    expandable
                  />

                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-mono text-[10px] tracking-[0.18em] text-faint uppercase">
                          {String(i + 1).padStart(2, "0")} / 03
                        </p>
                        <h2 className="type-display mt-2 text-[1.75rem]">{op.title}</h2>
                        <p className="mt-1.5 text-[12.5px] text-champagne">{op.headline}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-champagne/25 bg-champagne/10 px-3 py-1 font-mono text-[11px] text-champagne">
                        {op.impact} impact
                      </span>
                    </div>

                    <ImpactMeter value={op.impact} className="mt-4" />

                    <p className="mt-4 text-[14.5px] leading-relaxed text-cream/90">
                      {op.recommendation}
                    </p>

                    {op.disclaimer && (
                      <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-relaxed text-faint">
                        <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                        {op.disclaimer}
                      </p>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2.5">
                      {op.area === "hair" ? (
                        <Button size="sm" onClick={() => router.push("/styles")}>
                          <Sparkles className="size-3.5" aria-hidden />
                          Preview on me
                        </Button>
                      ) : (
                        <Button size="sm" variant="quiet" onClick={() => setDetail(op)}>
                          How to do it
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => setDetail(op)}>
                        Why this works
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-8 mb-2">
        <Button fullWidth variant="secondary" onClick={() => router.push("/plan")}>
          Put this into a 30-day plan
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>

      <Sheet
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.title ?? ""}
        description={detail ? `${detail.impact} impact` : undefined}
        footer={
          detail?.area === "hair" ? (
            <Button fullWidth onClick={() => router.push("/styles")}>
              Preview styles on me
            </Button>
          ) : undefined
        }
      >
        {detail && (
          <div className="space-y-6 pb-2">
            <div>
              <p className="eyebrow mb-2">Why this works</p>
              <p className="text-[14px] leading-relaxed text-muted">{detail.why}</p>
            </div>
            <div>
              <p className="eyebrow mb-3">What to actually do</p>
              <ul className="space-y-2.5">
                {detail.steps.map((s, i) => (
                  <li key={s} className="flex gap-3 text-[14px] leading-relaxed text-cream/90">
                    <span className="mt-0.5 font-mono text-[11px] text-champagne">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            {detail.disclaimer && (
              <p className="rounded-2xl border border-line bg-raised px-4 py-3 text-[12px] leading-relaxed text-faint">
                {detail.disclaimer}
              </p>
            )}
          </div>
        )}
      </Sheet>
    </main>
  );
}
