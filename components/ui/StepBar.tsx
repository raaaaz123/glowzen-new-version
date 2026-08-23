"use client";

import { useI18n } from "@/lib/i18n/I18nContext";
import { cn } from "@/lib/utils";

export function StepBar({ step, total }: { step: number; total: number }) {
  const { t, formatNumber } = useI18n();

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">{t("questionnaire.stepOf", { step, total })}</p>
        <p className="font-mono text-[11px] text-faint">
          {formatNumber(Math.round((step / total) * 100) / 100, { style: "percent" })}
        </p>
      </div>
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-[3px] flex-1 rounded-full transition-colors duration-400",
              i < step ? "bg-champagne" : "bg-cream/10",
            )}
          />
        ))}
      </div>
    </div>
  );
}
