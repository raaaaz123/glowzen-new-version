"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "quiet" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 font-medium transition-[transform,background,color,opacity] duration-200 active:scale-[.985] disabled:pointer-events-none disabled:opacity-45 select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-linear-to-b from-champagne-hi to-champagne text-on-accent shadow-[0_10px_34px_-12px_var(--accent-glow)] hover:brightness-[1.04]",
  secondary: "bg-raised text-cream border border-line hover:border-champagne/35",
  ghost: "text-muted hover:text-cream",
  quiet: "bg-cream/[.06] text-cream hover:bg-cream/[.1]",
  danger: "bg-danger-bg/8 text-danger border border-danger/25 hover:bg-danger-bg/14",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] rounded-xl",
  md: "h-12 px-5 text-sm rounded-2xl",
  lg: "h-14 px-6 text-[15px] rounded-2xl",
};

interface Common {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  children: ReactNode;
  className?: string;
}

export function Button({
  variant = "primary",
  size = "lg",
  fullWidth,
  loading,
  children,
  className,
  disabled,
  ...props
}: Common & ComponentProps<"button">) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "lg",
  fullWidth,
  children,
  className,
  ...props
}: Common & ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
    >
      {children}
    </Link>
  );
}
