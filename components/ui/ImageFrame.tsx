"use client";

import { Expand, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Portrait frame with its own loading state and an optional full-screen view.
 * Plain <img> on purpose: these are local SVG illustrations, so there is
 * nothing for the image optimiser to do.
 */
export function ImageFrame({
  src,
  alt,
  className,
  imgClassName,
  ratio = "aspect-[4/5]",
  expandable,
  overlay,
  priority,
}: {
  /** Nullable: a stored photo can be gone or never have been readable. */
  src: string | null | undefined;
  alt: string;
  className?: string;
  imgClassName?: string;
  ratio?: string;
  expandable?: boolean;
  overlay?: ReactNode;
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // A cached image can already be complete before onLoad is attached.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, [src]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className={cn("relative overflow-hidden bg-raised", ratio, className)}>
        {/* Pulse only while something is actually on its way. With no src
            there is nothing to wait for, and an empty one makes the browser
            re-request the whole page. */}
        {src && !loaded && (
          <div className="absolute inset-0 animate-pulse bg-raised" aria-hidden />
        )}
        {src && (
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            onLoad={() => setLoaded(true)}
            className={cn(
              "size-full object-cover transition-opacity duration-500",
              loaded ? "opacity-100" : "opacity-0",
              imgClassName,
            )}
          />
        )}
        {overlay}
        {expandable && (
          <button
            onClick={() => setOpen(true)}
            aria-label={`View ${alt} full screen`}
            className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/70"
          >
            <Expand className="size-4" />
          </button>
        )}
      </div>

      {/* `src` is nullable, and the same rule as the inline frame applies here:
          an absent source is not something to open full screen, and an empty
          one makes the browser re-request the page. */}
      {open && src && (
        <div className="animate-fade fixed inset-0 z-100 flex flex-col bg-ink/95 backdrop-blur-lg">
          <div className="safe-t flex justify-end p-4">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close preview"
              className="grid size-10 place-items-center rounded-full bg-raised text-cream"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center p-4 pb-16">
            <img src={src} alt={alt} className="max-h-full max-w-full rounded-card object-contain" />
          </div>
        </div>
      )}
    </>
  );
}
