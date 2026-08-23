"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useT } from "@/lib/i18n/I18nContext";
import { cn } from "@/lib/utils";

/** Bottom sheet on phones, centred dialog from `sm` upwards. */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-90 flex items-end justify-center sm:items-center">
      <button
        className="animate-fade absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label={t("common.close")}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "animate-sheet relative flex max-h-[88svh] w-full flex-col rounded-t-sheet border border-line bg-surface",
          "sm:animate-rise sm:max-w-md sm:rounded-sheet",
        )}
      >
        <div className="mx-auto mt-3 h-1 w-9 rounded-full bg-cream/15 sm:hidden" />
        <div className="flex items-start gap-4 px-6 pt-5 pb-4">
          <div className="flex-1">
            <h2 className="text-lg font-medium tracking-[-0.01em]">{title}</h2>
            {description && (
              <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="-me-1 -mt-1 rounded-full p-2 text-faint transition-colors hover:bg-cream/5 hover:text-cream"
            aria-label={t("common.close")}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-2">{children}</div>
        {footer && <div className="safe-b border-t border-line px-6 py-4">{footer}</div>}
        {!footer && <div className="safe-b pb-4" />}
      </div>
    </div>
  );
}
