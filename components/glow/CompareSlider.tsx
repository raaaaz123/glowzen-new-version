"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Mirror wipe: drag the line and the current look gives way to the potential one.
 * Pointer events cover mouse, touch and pen; arrow keys cover keyboard.
 */
export function CompareSlider({
  before,
  after,
  beforeLabel = "Current",
  afterLabel = "Potential",
  className,
  frameClassName = "aspect-[4/5]",
  imagePosition = "object-center",
  priority,
}: {
  /** Nullable: a scan can have no readable photo, and "" is not a valid src. */
  before: string | null;
  after: string | null;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  /** Override the default 4:5 frame, e.g. to cap the hero's height. */
  frameClassName?: string;
  imagePosition?: string;
  priority?: boolean;
}) {
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const move = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, next)));
  }, []);

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
          alt={afterLabel}
          loading={priority ? "eager" : "lazy"}
          className={cn("absolute inset-0 size-full object-cover", imagePosition)}
        />
      )}
      {before && (
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <img
            src={before}
            alt={beforeLabel}
            loading={priority ? "eager" : "lazy"}
            className={cn("size-full object-cover", imagePosition)}
          />
        </div>
      )}

      <span className="absolute top-3 left-3 rounded-full bg-black/55 px-3 py-1 font-mono text-[10px] tracking-[0.14em] text-white/90 uppercase backdrop-blur-md">
        {beforeLabel}
      </span>
      <span className="absolute top-3 right-3 rounded-full bg-champagne px-3 py-1 font-mono text-[10px] tracking-[0.14em] text-on-accent uppercase">
        {afterLabel}
      </span>

      <div
        className="absolute inset-y-0 w-px bg-cream/90 shadow-[0_0_24px_rgba(244,219,174,.55)]"
        style={{ left: `${position}%` }}
      >
        <button
          type="button"
          role="slider"
          aria-label="Compare current and potential"
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
