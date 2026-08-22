"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function OptionCard({
  label,
  hint,
  selected,
  onSelect,
  compact,
  multi,
  disabled,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
  /** Square marker instead of a radio, for pick-several questions. */
  multi?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled && !selected}
      aria-pressed={selected}
      className={cn(
        "group flex w-full items-center gap-4 rounded-2xl border text-left transition-[border-color,background-color,opacity] duration-200",
        compact ? "px-4 py-3.5" : "px-5 py-4",
        selected
          ? "animate-pop border-champagne/60 bg-champagne/8"
          : "border-line bg-surface hover:border-cream/20 active:scale-[.99]",
        disabled && !selected && "pointer-events-none opacity-35",
      )}
    >
      <span className="flex-1">
        <span
          className={cn(
            "block font-medium tracking-[-0.01em]",
            compact ? "text-[15px]" : "text-base",
            selected ? "text-cream" : "text-cream/90",
          )}
        >
          {label}
        </span>
        {hint && <span className="mt-0.5 block text-[13px] leading-snug text-muted">{hint}</span>}
      </span>
      <span
        className={cn(
          "grid size-6 shrink-0 place-items-center border transition-all duration-200",
          multi ? "rounded-md" : "rounded-full",
          selected
            ? "border-champagne bg-champagne text-on-accent"
            : "border-line group-hover:border-cream/30",
        )}
      >
        {selected && <Check className="animate-tick size-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}

/** Compact pill for short answers — texture, length, age. */
export function OptionChip({
  label,
  selected,
  onSelect,
  disabled,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled && !selected}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-[border-color,background-color,opacity] duration-200",
        selected
          ? "animate-pop border-champagne bg-champagne font-medium text-on-accent"
          : "border-line bg-surface text-cream/85 hover:border-cream/25 active:scale-[.98]",
        disabled && !selected && "pointer-events-none opacity-35",
      )}
    >
      {selected && <Check className="animate-tick size-3.5" strokeWidth={3} />}
      {label}
    </button>
  );
}
