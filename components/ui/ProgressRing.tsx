"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The recurring "light meter": a warm arc that fills the way a studio light
 * comes up. Used for the analysis loader and every impact figure.
 */
export function ProgressRing({
  value,
  size = 220,
  stroke = 10,
  children,
  className,
  animate = true,
  trackOpacity = 1,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  className?: string;
  animate?: boolean;
  trackOpacity?: number;
}) {
  const [shown, setShown] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!animate) {
      setShown(value);
      return;
    }
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value, animate]);

  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const gradientId = `ring-${size}-${stroke}`;

  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-champagne-hi)" />
            <stop offset="55%" stopColor="var(--color-champagne)" />
            <stop offset="100%" stopColor="var(--color-champagne-lo)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={stroke}
          opacity={trackOpacity}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (circumference * shown) / 100}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/** Compact horizontal version for the ranked opportunity cards. */
export function ImpactMeter({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-cream/8", className)}>
      <div
        className="h-full rounded-full bg-linear-to-r from-champagne-lo via-champagne to-champagne-hi"
        style={{ width: `${shown}%`, transition: "width 1s cubic-bezier(.22,1,.36,1)" }}
      />
    </div>
  );
}
