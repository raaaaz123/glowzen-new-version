"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Camera,
  ChevronRight,
  GitCompareArrows,
  Palette,
  ScanFace,
  Scissors,
  Shirt,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Card, SectionHeader } from "@/components/ui/Card";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { ButtonLink } from "@/components/ui/Button";
import { TopBar } from "@/components/app/TopBar";
import { useAsync } from "@/lib/useAsync";
import { useGlow } from "@/lib/state/GlowContext";
import { useT } from "@/lib/i18n/I18nContext";
import { getPastScans } from "@/services/analysisService";

export default function AnalyzePage() {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const { gender, hasAnalysis } = useGlow();
  const { data, loading, error, reload } = useAsync(() => getPastScans(gender), [gender]);

  const actions: {
    icon: LucideIcon;
    label: string;
    body: string;
    onClick: () => void;
    primary?: boolean;
  }[] = [
    {
      icon: Camera,
      label: t("analyze.newSelfie"),
      body: t("analyze.newSelfieBody"),
      onClick: () => router.push("/upload"),
      primary: true,
    },
    {
      icon: GitCompareArrows,
      label: t("analyze.compare"),
      body: t("analyze.compareBody"),
      onClick: () => router.push("/progress"),
    },
    {
      icon: Scissors,
      label: t("analyze.tryHairstyle"),
      body: t("analyze.tryHairstyleBody"),
      onClick: () => router.push("/styles"),
    },
    ...(gender === "male"
      ? []
      : [
          {
            icon: Palette,
            label: t("analyze.makeupShades"),
            body: t("analyze.makeupShadesBody"),
            onClick: () => router.push("/makeup"),
          },
        ]),
    gender === "male"
      ? {
          icon: ScanFace,
          label: t("analyze.tryBeard"),
          body: t("analyze.tryBeardBody"),
          onClick: () => router.push("/beard"),
        }
      : {
          icon: ScanFace,
          label: t("analyze.tryGrooming"),
          body: t("analyze.tryGroomingBody"),
          onClick: () => toast(t("analyze.groomingSoon"), "info"),
        },
    {
      icon: Shirt,
      label: t("analyze.analyzeStyle"),
      body: t("analyze.analyzeStyleBody"),
      onClick: () => toast(t("analyze.styleSoon"), "info"),
    },
  ];

  return (
    <main>
      <TopBar back={false} title={t("analyze.title")} />

      <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted">{t("analyze.intro")}</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {actions.map(({ icon: Icon, label, body, onClick, primary }) => (
          <button key={label} onClick={onClick} className="text-start">
            <Card
              className={`h-full p-5 transition-colors hover:border-champagne/35 ${
                primary ? "col-span-2 border-champagne/30 bg-champagne/6" : ""
              }`}
            >
              <span
                className={`mb-4 grid size-10 place-items-center rounded-xl ${
                  primary ? "bg-champagne text-on-accent" : "bg-raised text-champagne"
                }`}
              >
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <p className="text-[15px] font-medium">{label}</p>
              <p className="mt-1 text-[12.5px] leading-snug text-muted">{body}</p>
            </Card>
          </button>
        ))}
      </div>

      <section className="mt-10 mb-2">
        <SectionHeader eyebrow={t("analyze.history")} title={t("analyze.previousAnalyses")} />

        {!loading && !error && hasAnalysis && data && data.length > 0 && (
          <p className="mb-4 -mt-1 text-[12.5px] leading-relaxed text-muted">
            {t("analyze.openAnyScan")}
          </p>
        )}

        {error && <ErrorState message={error} onRetry={reload} />}

        {loading && !error && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-card" />
            ))}
          </div>
        )}

        {!loading && !error && !hasAnalysis && (
          <EmptyState
            icon={Sparkles}
            title={t("analyze.noAnalysesTitle")}
            body={t("analyze.noAnalysesBody")}
            action={
              <ButtonLink href="/upload" size="md">
                {t("analyze.startFirst")}
              </ButtonLink>
            }
          />
        )}

        {!loading && !error && hasAnalysis && data && (
          <ul className="space-y-3">
            {data.map((scan) => (
              <li key={scan.id}>
                <Link href={`/analyze/${scan.id}`} className="group block">
                  <Card className="flex items-center gap-3 p-3 transition-colors group-hover:border-champagne/35 group-active:border-champagne/50 sm:gap-4">
                    <ImageFrame
                      src={scan.photo}
                      alt=""
                      ratio="aspect-square"
                      className="w-14 shrink-0 rounded-xl"
                      imgClassName="object-[center_20%]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                        <p className="text-[14.5px] font-medium">{scan.label}</p>
                        <span className="font-mono text-[11px] text-faint">{scan.dateLabel}</span>
                      </div>
                      <p className="mt-1 truncate text-[12.5px] text-muted">
                        {t("analyze.topOpportunity")}{" "}
                        <span className="text-cream/85">{scan.topArea}</span>
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-line px-2.5 py-1 font-mono text-[11px] text-champagne">
                      {scan.overall}
                    </span>
                    <ChevronRight
                      className="size-4 shrink-0 text-faint transition-colors group-hover:text-champagne rtl:-scale-x-100"
                      aria-hidden
                    />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
