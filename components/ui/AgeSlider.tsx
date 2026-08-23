"use client";

import { useCallback, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { AGE_DEFAULT, AGE_MAX, AGE_MIN, clampAge } from "@/lib/data/questions";
import { useI18n } from "@/lib/i18n/I18nContext";
import { cn } from "@/lib/utils";

/** Decade marks. The ends carry their own labels, so those are left out here. */
const TICKS = [20, 30, 40, 50, 60, 70, 80];

/**
 * Exact age in one gesture.
 *
 * Not a native `input[type=range]` — the thumb, the fill and the ticks all
 * need to be styled together, and Safari gives no way to do that. Everything
 * a range input provides for free is reimplemented here: pointer capture so a
 * drag survives leaving the track, the full arrow/page/home/end key set, and
 * the ARIA a slider needs to be announced properly.
 */
export function AgeSlider({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (age: number) => void;
}) {
  const { t, dir, formatNumber } = useI18n();
  const rtl = dir === "rtl";
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  // Before the first touch the thumb parks on a plausible age, shown dimmed so
  // it never reads as an answer the person didn't give.
  const shown = value ?? AGE_DEFAULT;
  const set = value !== null;
  const percent = ((shown - AGE_MIN) / (AGE_MAX - AGE_MIN)) * 100;
  const physical = rtl ? 100 - percent : percent;

  const fromPointer = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return;
      const raw = (clientX - rect.left) / rect.width;
      const fraction = Math.min(1, Math.max(0, rtl ? 1 - raw : raw));
      onChange(clampAge(AGE_MIN + fraction * (AGE_MAX - AGE_MIN)));
    },
    [onChange, rtl],
  );

  const nudge = (delta: number) => onChange(clampAge(shown + delta));

  function onKeyDown(e: React.KeyboardEvent) {
    const back = rtl ? 1 : -1;
    const map: Record<string, number> = {
      ArrowLeft: back,
      ArrowRight: -back,
      ArrowDown: -1,
      ArrowUp: 1,
      PageDown: -5,
      PageUp: 5,
    };
    if (e.key in map) {
      e.preventDefault();
      nudge(map[e.key]);
      return;
    }
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      onChange(e.key === "Home" ? AGE_MIN : AGE_MAX);
    }
  }

  return (
    <div className="rounded-3xl border border-line bg-surface/90 p-4 backdrop-blur-md sm:p-5">
      {/* Readout, with a stepper on each side for the last year or two. */}
      <div className="flex items-center justify-between gap-3">
        <StepButton
          icon={Minus}
          label={t("questionnaire.ageDecrease")}
          disabled={set && shown <= AGE_MIN}
          onPress={() => nudge(-1)}
        />

        <div className="min-w-0 text-center">
          <div
            className={cn(
              "type-display text-[2.75rem] leading-none tabular-nums transition-colors duration-200 sm:text-[3.25rem]",
              set ? "text-cream" : "text-faint/50",
            )}
          >
            {formatNumber(shown)}
          </div>
          <div className={cn("eyebrow mt-1.5 block", set && "text-champagne")}>
            {t("questionnaire.ageUnit")}
          </div>
        </div>

        <StepButton
          icon={Plus}
          label={t("questionnaire.ageIncrease")}
          disabled={set && shown >= AGE_MAX}
          onPress={() => nudge(1)}
        />
      </div>

      {/* Track. `touch-none` so a drag never turns into a page scroll. */}
      <div
        className="relative mt-6 touch-none px-1 pt-1"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          fromPointer(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging) fromPointer(e.clientX);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        {/* A tall invisible hit area — the visible bar is far thinner than a fingertip. */}
        <div className="absolute inset-x-0 -top-3 h-12" aria-hidden />

        <div ref={trackRef} className="relative h-2 w-full rounded-full bg-raised">
          <div
            className={cn(
              "absolute inset-y-0 rounded-full transition-opacity duration-200",
              set ? "bg-linear-to-r from-champagne-lo via-champagne to-champagne-hi" : "bg-line",
            )}
            style={{ left: rtl ? `${100 - percent}%` : 0, width: `${percent}%` }}
          />

          <div
            role="slider"
            tabIndex={0}
            aria-label={t("questionnaire.step1LegendAge")}
            aria-valuemin={AGE_MIN}
            aria-valuemax={AGE_MAX}
            aria-valuenow={set ? shown : undefined}
            aria-valuetext={set ? `${shown}` : t("common.notSet")}
            onKeyDown={onKeyDown}
            className={cn(
              "absolute top-1/2 grid size-7 cursor-grab place-items-center rounded-full border-2 bg-ink transition-[transform,border-color,box-shadow] duration-150 outline-none",
              dragging && "scale-110 cursor-grabbing",
              set
                ? "border-champagne shadow-[0_0_0_6px_rgb(229_178_106/0.14)]"
                : "border-cream/25 shadow-none",
            )}
            style={{ left: `${physical}%`, transform: "translate(-50%, -50%)" }}
          >
            <span
              className={cn(
                "size-2.5 rounded-full transition-colors duration-200",
                set ? "bg-champagne" : "bg-faint",
              )}
            />
          </div>
        </div>

        {/* Decade marks, tappable in their own right. */}
        <div className="mt-3.5 flex items-start justify-between">
          <Edge label={formatNumber(AGE_MIN)} onPress={() => onChange(AGE_MIN)} />
          {TICKS.map((tick) => (
            <button
              key={tick}
              type="button"
              onClick={() => onChange(tick)}
              className="group flex flex-1 flex-col items-center gap-1.5 rounded-lg py-0.5"
            >
              <span
                className={cn(
                  "h-2 w-px rounded-full transition-colors",
                  set && shown >= tick ? "bg-champagne/60" : "bg-line",
                )}
              />
              <span
                className={cn(
                  "text-[11px] tabular-nums transition-colors sm:text-[12px]",
                  set && Math.abs(shown - tick) < 5
                    ? "font-semibold text-champagne"
                    : "text-faint group-hover:text-muted",
                )}
              >
                {formatNumber(tick)}
              </span>
            </button>
          ))}
          <Edge label={`${formatNumber(AGE_MAX)}+`} onPress={() => onChange(AGE_MAX)} />
        </div>
      </div>

      <p className="mt-3 text-center text-[12px] leading-relaxed text-faint">
        {t("questionnaire.ageHelper")}
      </p>
    </div>
  );
}

function StepButton({
  icon: Icon,
  label,
  disabled,
  onPress,
}: {
  icon: typeof Minus;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onPress}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full border border-line bg-raised text-cream transition-[background-color,border-color,opacity,transform] duration-150",
        "hover:border-champagne/50 hover:bg-champagne/10 active:scale-95",
        "disabled:pointer-events-none disabled:opacity-30",
      )}
    >
      <Icon className="size-4.5" strokeWidth={2.5} />
    </button>
  );
}

/** The two ends of the scale, narrower than a decade mark so they don't crowd it. */
function Edge({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="w-6 shrink-0 pt-3.5 text-[11px] tabular-nums text-faint transition-colors hover:text-muted sm:text-[12px]"
    >
      {label}
    </button>
  );
}
