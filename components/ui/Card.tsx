import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "dark" | "raised" | "linen" | "outline";

const tones: Record<Tone, string> = {
  dark: "bg-surface border border-line",
  raised: "bg-raised border border-line",
  linen: "bg-linen text-linen-ink border border-black/5",
  outline: "border border-line bg-transparent",
};

export function Card({
  tone = "dark",
  as: Tag = "div",
  className,
  children,
}: {
  tone?: Tone;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={cn("rounded-card", tones[tone], className)}>{children}</Tag>;
}

export function SectionHeader({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div>
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h2 className="text-[19px] font-medium tracking-[-0.01em]">{title}</h2>
      </div>
      {action}
    </div>
  );
}
