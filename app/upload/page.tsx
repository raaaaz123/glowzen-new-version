"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera, Check, ImageIcon, Lock, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { TopBar } from "@/components/app/TopBar";
import { StickyCta } from "@/components/app/StickyCta";
import { useToast } from "@/components/ui/Toast";
import { useGlow } from "@/lib/state/GlowContext";
import { useT } from "@/lib/i18n/I18nContext";
import { photoGuide } from "@/lib/data/showcase";
import { submitPhoto } from "@/services/analysisService";

const GUIDELINE_KEYS = [
  "upload.guide1",
  "upload.guide2",
  "upload.guide3",
  "upload.guide4",
  "upload.guide5",
];

const MAX_MB = 12;

export default function UploadPage() {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const { photoUrl, setPhotoUrl, setPhotoKey, gender } = useGlow();
  const guide = photoGuide(gender);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("upload.notAnImage"));
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(t("upload.tooLarge", { max: MAX_MB }));
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const stored = await submitPhoto(file);
      setPhotoUrl(stored.url);
      setPhotoKey(stored.key || null);
      toast(t("upload.added"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("upload.unreadable"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="min-h-svh px-5 pb-4 lg:mx-auto lg:max-w-[900px] lg:px-8">
      <TopBar back sticky={false} action={<span className="eyebrow">{t("upload.eyebrow")}</span>} />

      <div className="lg:grid lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-12">
        <div>
          <h1 className="type-display mt-4 text-[clamp(2rem,7.5vw,2.6rem)]">
            {t("upload.title")}
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">{t("upload.subtitle")}</p>

          {/* ——— drop / preview area */}
          <div className="mt-7">
            {photoUrl ? (
              <div className="animate-fade relative">
                <ImageFrame
                  src={photoUrl}
                  alt={t("upload.yourPhoto")}
                  className="max-h-[46svh] rounded-card"
                  expandable
                  priority
                />
                <button
                  onClick={() => {
                    setPhotoUrl(null);
                    setPhotoKey(null);
                  }}
                  className="absolute top-3 start-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-2 text-[12px] text-white backdrop-blur-md transition-colors hover:bg-black/75"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  {t("upload.remove")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => galleryRef.current?.click()}
                disabled={uploading}
                className="flex aspect-[4/5] max-h-[42svh] w-full flex-col items-center justify-center rounded-card border border-dashed border-line bg-linear-to-b from-surface to-ink transition-colors hover:border-champagne/40 disabled:opacity-50"
              >
                <span className="animate-halo mb-5 grid size-16 place-items-center rounded-2xl bg-champagne/10 text-champagne">
                  <Camera className="size-6" aria-hidden />
                </span>
                <span className="text-[15px] font-medium">
                  {uploading ? t("upload.adding") : t("upload.addPhoto")}
                </span>
                <span className="mt-1.5 text-[13px] text-muted">
                  {t("upload.fileHint", { max: MAX_MB })}
                </span>
              </button>
            )}
          </div>

          {error && (
            <p className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed text-danger-soft">
              <X className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Button variant="secondary" size="md" onClick={() => cameraRef.current?.click()}>
              <Camera className="size-4" aria-hidden />
              {t("upload.takePhoto")}
            </Button>
            <Button variant="secondary" size="md" onClick={() => galleryRef.current?.click()}>
              <ImageIcon className="size-4" aria-hidden />
              {t("upload.chooseGallery")}
            </Button>
          </div>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="user"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        {/* ——— guidance */}
        <div className="mt-10 lg:mt-4">
          <Card className="p-5">
            <p className="eyebrow mb-4">{t("upload.guideTitle")}</p>
            <div className="grid grid-cols-2 gap-3">
              <Example src={guide.good} label={t("upload.guideWorks")} good />
              <Example src={guide.bad} label={t("upload.guideTooDark")} />
            </div>

            <ul className="mt-5 space-y-2.5">
              {GUIDELINE_KEYS.map((key) => (
                <li key={key} className="flex items-center gap-3 text-[13.5px] text-cream/85">
                  <Check className="size-3.5 shrink-0 text-champagne" strokeWidth={2.6} aria-hidden />
                  {t(key)}
                </li>
              ))}
            </ul>
          </Card>

          <p className="mt-4 flex items-start gap-2 px-1 text-[12px] leading-relaxed text-faint">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {t("upload.privacy")}
          </p>
        </div>
      </div>

      <StickyCta note={t("upload.deleteNote")}>
        <Button fullWidth disabled={!photoUrl} onClick={() => router.push("/analyzing")}>
          {t("upload.cta")}
        </Button>
      </StickyCta>
    </main>
  );
}

function Example({ src, label, good }: { src: string; label: string; good?: boolean }) {
  return (
    <figure>
      <ImageFrame
        src={src}
        alt={label}
        className="rounded-2xl"
        imgClassName={good ? "object-[center_20%]" : "object-[center_20%] opacity-40 blur-[2px] brightness-50"}
      />
      <figcaption
        className={`mt-2 text-center font-mono text-[10px] tracking-[0.14em] uppercase ${
          good ? "text-champagne" : "text-faint"
        }`}
      >
        {label}
      </figcaption>
    </figure>
  );
}
