import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-raised",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer",
        "after:bg-linear-to-r after:from-transparent after:via-cream/[.07] after:to-transparent",
        className,
      )}
      aria-hidden
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="space-y-4 rounded-card border border-line bg-surface p-5">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
