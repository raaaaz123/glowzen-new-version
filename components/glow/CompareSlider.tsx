"use client";

import { useCallback, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { cn } from "@/lib/utils";

/**
 * Mirror wipe: drag the line and the current look gives way to the potential one.
 * Pointer events cover mouse, touch and pen; arrow keys cover keyboard.
 */
export function CompareSlider({
  before,
  after,
  beforeLabel,
  afterLabel,
  className,
  frameClassName = "aspect-[4/5]",
  imagePosition = "object-center",
  priority = true,
}: {
  /** Nullable: a scan can have no readable photo, and "" is not a valid src. */
  before: string | null;
  after: string | null;
  /** Defaults to the translated "Current" / "Potential". */
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  /** Override the default 4:5 frame, e.g. to cap the hero's height. */
  frameClassName?: string;
  imagePosition?: string;
  /**
   * Eager by default. This component is never decoration — it is the render
   * the screen exists to show, and it is above the fold on every screen that
   * uses it. Lazy images that enter the viewport during a client render often
   * do not fetch until the first scroll, which reads as a preview that never
   * arrived.
   */
  priority?: boolean;
}) {
  const { t, dir } = useI18n();
  const before_ = beforeLabel ?? t("common.current");
  const after_ = afterLabel ?? t("common.potential");
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // In a right-to-left layout the "before" side is on the right, so the
  // position the pointer maps to is measured from the right edge instead.
  const rtl = dir === "rtl";
  const move = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const raw = rtl ? rect.right - clientX : clientX - rect.left;
      setPosition(Math.min(100, Math.max(0, (raw / rect.width) * 100)));
    },
    [rtl],
  );

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative touch-none overflow-hidden rounded-card bg-raised select-none",
        frameClassName,
        className,
      )}
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        setDragging(true);
        move(e.clientX);
      }}
      onPointerMove={(e) => dragging && move(e.clientX)}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
    >
      {/* An empty src makes the browser re-request the page, so a missing side
          is simply not rendered — the raised frame shows through instead. */}
      {after && (
        <img
          src={after}
          alt={after_}
          loading={priority ? "eager" : "lazy"}
          className={cn("absolute inset-0 size-full object-cover", imagePosition)}
        />
      )}
      {before && (
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            clipPath: rtl
              ? `inset(0 0 0 ${100 - position}%)`
              : `inset(0 ${100 - position}% 0 0)`,
          }}
        >
          <img
            src={before}
            alt={before_}
            loading={priority ? "eager" : "lazy"}
            className={cn("size-full object-cover", imagePosition)}
          />
        </div>
      )}

      <span className="absolute top-3 start-3 rounded-full bg-black/55 px-3 py-1 font-mono text-[10px] tracking-[0.14em] text-white/90 uppercase backdrop-blur-md">
        {before_}
      </span>
      <span className="absolute top-3 end-3 rounded-full bg-champagne px-3 py-1 font-mono text-[10px] tracking-[0.14em] text-on-accent uppercase">
        {after_}
      </span>

      <div
        className="absolute inset-y-0 w-px bg-cream/90 shadow-[0_0_24px_rgba(244,219,174,.55)]"
        style={{ insetInlineStart: `${position}%` }}
      >
        <button
          type="button"
          role="slider"
          aria-label={t("compare.label")}
          aria-valuenow={Math.round(position)}
          aria-valuemin={0}
          aria-valuemax={100}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 4));
            if (e.key === "ArrowRight") setPosition((p) => Math.min(100, p + 4));
          }}
          className="absolute top-1/2 left-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-cream/25 bg-ink/70 backdrop-blur-md"
        >
          <span className="flex gap-1" aria-hidden>
            <span className="h-3 w-px bg-cream/70" />
            <span className="h-3 w-px bg-cream/70" />
          </span>
        </button>
      </div>
    </div>
  );
}
