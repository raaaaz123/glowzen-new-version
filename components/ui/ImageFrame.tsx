"use client";

import { Expand, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n/I18nContext";
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
  const t = useT();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  /**
   * `load` does not bubble, so React attaches onLoad to the element itself at
   * commit time — and an image that finishes before that simply never fires it
   * for us. The frame then sits at opacity 0 over its own skeleton with a
   * perfectly good photo inside it, which is what an empty card on the report
   * actually is. Checking `complete` as the node mounts catches the ones the
   * effect below is already too late for.
   */
  const attach = useCallback((node: HTMLImageElement | null) => {
    imgRef.current = node;
    if (node?.complete && node.naturalWidth > 0) setLoaded(true);
  }, []);

  useEffect(() => {
    setFailed(false);
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
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
        {src && !loaded && !failed && (
          <div className="absolute inset-0 animate-pulse bg-raised" aria-hidden />
        )}
        {src && (
          <img
            ref={attach}
            src={src}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            onLoad={() => setLoaded(true)}
            // A frame that will never fill should stop pretending it is about
            // to: the pulse is a promise, and this one cannot be kept.
            onError={() => setFailed(true)}
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
            aria-label={t("imageFrame.viewFullScreen", { alt })}
            className="absolute top-3 end-3 grid size-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/70"
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
              aria-label={t("imageFrame.closePreview")}
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
