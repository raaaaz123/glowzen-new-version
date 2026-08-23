"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight, Camera, Check, CircleDashed } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { ImpactMeter } from "@/components/ui/ProgressRing";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState, NothingYet } from "@/components/ui/States";
import { TopBar } from "@/components/app/TopBar";
import { CompareSlider } from "@/components/glow/CompareSlider";
import { useAsync } from "@/lib/useAsync";
import { useGlow } from "@/lib/state/GlowContext";
import { useT } from "@/lib/i18n/I18nContext";
import { getPlan, getProgress } from "@/services/progressService";
import { cn } from "@/lib/utils";

export default function ProgressPage() {
  const router = useRouter();
  const t = useT();
  const { gender } = useGlow();
  const { data, loading, error, empty, reload } = useAsync(() => getProgress(gender), [gender]);
  const plan = useAsync(() => getPlan(gender), [gender]);

  return (
    <main>
      <TopBar back={false} title={t("progress.title")} />

      {empty && (
        <div className="mt-8">
          <NothingYet empty={empty} title={t("progress.emptyTitle")} />
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
          <Skeleton className="h-40 w-full rounded-card" />
        </div>
      )}

      {data && (
        <div className="animate-rise lg:grid lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-10">
          {/* min-w-0 on both tracks: the check-in strip is eight fixed-width
              tiles, and without it that row's min-content sets the column
              width — the track grows to 774px and squeezes the comparison
              down to nothing. With it the tiles scroll, as they do on phones. */}
          <div className="mt-6 min-w-0">
            <CompareSlider
              before={data.before.photo}
              after={data.after.photo}
              beforeLabel={data.before.dayLabel}
              afterLabel={data.after.dayLabel}
            />

            <div className="mt-3 grid grid-cols-2 gap-3">
              {[data.before, data.after].map((snap, i) => (
                <Card key={snap.id} className="flex items-center gap-3 p-3">
                  <ImageFrame
                    src={snap.thumb ?? snap.photo}
                    alt={snap.dayLabel}
                    ratio="aspect-square"
                    className="w-12 shrink-0 rounded-xl"
                    imgClassName="object-[center_22%]"
                  />
                  <div>
                    <p className={cn("text-[13.5px] font-medium", i === 1 && "text-champagne")}>
                      {snap.dayLabel}
                    </p>
                    <p className="font-mono text-[11px] text-faint">{snap.dateLabel}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="mt-10 min-w-0 lg:mt-6">
            <Card tone="linen" className="p-6">
              <p className="font-mono text-[10px] tracking-[0.18em] text-black/45 uppercase">
                {t("progress.thirtyDaysIn")}
              </p>
              <p className="type-display mt-3 text-[1.7rem] leading-[1.15]">
                {data.headline}
              </p>
            </Card>

            {plan.data && (
              <section className="mt-8">
                <SectionHeader
                  eyebrow={t("progress.checkInsEyebrow")}
                  title={t("progress.checkIns")}
                  action={
                    <span className="font-mono text-[11px] text-faint">
                      {plan.data.checkIns.filter((c) => c.state === "done").length}/8
                    </span>
                  }
                />
                <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5 lg:mx-0 lg:px-0">
                  {plan.data.checkIns.map((c) => (
                    <div
                      key={c.week}
                      className={cn(
                        "flex w-[5.5rem] shrink-0 flex-col items-center gap-2 rounded-2xl border px-2 py-3.5",
                        c.state === "done" && "border-champagne/35 bg-champagne/6",
                        c.state === "due" && "border-champagne bg-champagne/10",
                        c.state === "upcoming" && "border-line opacity-60",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-8 place-items-center rounded-full",
                          c.state === "upcoming" ? "text-faint" : "bg-champagne/15 text-champagne",
                        )}
                      >
                        {c.state === "done" ? (
                          <Check className="size-3.5" strokeWidth={3} aria-hidden />
                        ) : c.state === "due" ? (
                          <Camera className="size-3.5" aria-hidden />
                        ) : (
                          <CircleDashed className="size-3.5" aria-hidden />
                        )}
                      </span>
                      <span className="text-[12px] font-medium">{c.label}</span>
                      <span className="text-center font-mono text-[9px] leading-tight text-faint">
                        {c.dateLabel}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11.5px] leading-relaxed text-faint">
                  {t("progress.checkInsNote")}
                </p>
              </section>
            )}

            <section className="mt-8">
              <SectionHeader eyebrow={t("progress.movement")} title={t("progress.whatChanged")} />
              <Card className="space-y-5 p-5">
                {data.metrics.map((m) => {
                  const delta = m.to - m.from;
                  return (
                    <div key={m.key}>
                      <div className="mb-2 flex items-baseline justify-between gap-3">
                        <span className="text-[14px] text-cream/90">{m.label}</span>
                        <span className="flex items-baseline gap-2 font-mono text-[11px]">
                          <span className="text-faint">
                            {m.from} → {m.to}
                          </span>
                          <span className="flex items-center gap-0.5 text-sage">
                            <ArrowUpRight className="size-3 rtl:-scale-x-100" aria-hidden />
                            {delta}
                          </span>
                        </span>
                      </div>
                      <div className="relative">
                        <ImpactMeter value={m.to} />
                        <span
                          className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-cream/40"
                          style={{ insetInlineStart: `${m.from}%` }}
                          aria-hidden
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="text-[11.5px] leading-relaxed text-faint">
                  {t("progress.metricsNote")}
                </p>
              </Card>
            </section>

            <section className="mt-8">
              <SectionHeader eyebrow={t("progress.timeline")} title={t("progress.howYouGotHere")} />
              <ol className="space-y-0">
                {data.timeline.map((item, i) => (
                  <li key={item.label} className="relative flex gap-4 pb-6 ps-1 last:pb-0">
                    {i < data.timeline.length - 1 && (
                      <span className="absolute top-6 bottom-0 start-[10px] w-px bg-line" aria-hidden />
                    )}
                    <span
                      className={cn(
                        "z-1 mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border",
                        item.done
                          ? "border-champagne/40 bg-champagne/15 text-champagne"
                          : "border-line bg-ink",
                      )}
                    >
                      {item.done && <Check className="size-2.5" strokeWidth={3.4} aria-hidden />}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className={cn("text-[14px]", item.done ? "text-cream/90" : "text-faint")}>
                          {item.label}
                        </p>
                        <span className="font-mono text-[11px] text-faint">{item.date}</span>
                      </div>
                      <p className="mt-0.5 text-[12.5px] text-muted">{item.note}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <Button fullWidth className="mt-6 mb-2" onClick={() => router.push("/upload")}>
              <Camera className="size-4" aria-hidden />
              {t("progress.rescan")}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
