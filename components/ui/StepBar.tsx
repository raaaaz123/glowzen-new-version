import { cn } from "@/lib/utils";

export function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">
          Step {step} of {total}
        </p>
        <p className="font-mono text-[11px] text-faint">
          {Math.round((step / total) * 100)}%
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
