"use client";

import Link from "next/link";
import { Camera, Scissors } from "lucide-react";
import { useT } from "@/lib/i18n/I18nContext";

/**
 * Shown when a matched style can't be rendered — almost always because there's
 * no photo to render it on. Better to say so than to show a picture of a
 * different haircut and call it theirs.
 */
export function PreviewPending({
  photo,
  styleName,
  notes,
  stylistWord,
}: {
  photo: string | null;
  styleName: string;
  notes: string;
  stylistWord: string;
}) {
  const t = useT();

  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-raised">
      {photo && (
        <img
          src={photo}
          alt=""
          aria-hidden
          className="size-full object-cover opacity-25 blur-[2px]"
        />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink/55 px-7 text-center backdrop-blur-[2px]">
        <span className="grid size-12 place-items-center rounded-2xl bg-champagne/12 text-champagne">
          {photo ? <Scissors className="size-5" aria-hidden /> : <Camera className="size-5" aria-hidden />}
        </span>
        <div>
          <p className="text-[15px] font-medium">
            {t(photo ? "previewPending.noPreview" : "previewPending.addPhoto")}
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            {t(photo ? "previewPending.notRenderedYet" : "previewPending.needsPhoto", {
              name: styleName,
            })}{" "}
            {t("previewPending.notesMatter")}
          </p>
        </div>
        {notes && (
          <p className="max-w-xs rounded-2xl border border-line bg-surface/80 px-4 py-3 text-[12.5px] leading-relaxed text-cream/85">
            {t("previewPending.tellYour", { stylist: stylistWord })} &ldquo;{notes}&rdquo;
          </p>
        )}
        {!photo && (
          <Link
            href="/analyze"
            className="text-[13px] text-champagne underline underline-offset-4"
          >
            {t("previewPending.addYourPhoto")}
          </Link>
        )}
      </div>
    </div>
  );
}
