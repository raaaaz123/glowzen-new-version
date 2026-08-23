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

    // Validate the file is actually a decodable image before uploading
    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
    } catch {
      setError(t("upload.unreadable"));
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const stored = await submitPhoto(file);

      // Verify the returned URL actually loads a visible image
      const valid = await new Promise<boolean>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.naturalWidth > 0 && img.naturalHeight > 0);
        img.onerror = () => resolve(false);
        img.src = stored.url;
      });

      if (!valid) {
        setError(t("upload.unreadable"));
        return;
      }

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
    <main className="min-h-svh px-4 sm:px-6 pb-28 lg:mx-auto lg:max-w-[960px] lg:px-8">
      <TopBar back sticky={false} action={<span className="eyebrow">{t("upload.eyebrow")}</span>} />

      <div className="lg:grid lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-14">
        {/* Left column / Top section: Photo Upload & Action Controls */}
        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
          <h1 className="type-display mt-2 sm:mt-4 text-[clamp(2rem,7.5vw,2.6rem)]">
            {t("upload.title")}
          </h1>
          <p className="mt-2.5 text-[14px] leading-relaxed text-muted max-w-md mx-auto sm:mx-0">
            {t("upload.subtitle")}
          </p>

          {/* ——— drop / preview area centered */}
          <div className="mt-6 w-full flex justify-center">
            {photoUrl ? (
              <div className="animate-fade relative w-full max-w-[320px] sm:max-w-[360px] mx-auto">
                <ImageFrame
                  src={photoUrl}
                  alt={t("upload.yourPhoto")}
                  className="max-h-[44svh] aspect-[4/5] rounded-card shadow-pop mx-auto"
                  expandable
                  priority
                />
                <button
                  onClick={() => {
                    setPhotoUrl(null);
                    setPhotoKey(null);
                  }}
                  className="absolute top-3 start-3 z-10 flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-2 text-[12px] font-medium text-white backdrop-blur-md transition-all hover:bg-black/85 active:scale-95 shadow-md"
                >
                  <Trash2 className="size-3.5 text-danger-soft" aria-hidden />
                  {t("upload.remove")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => galleryRef.current?.click()}
                disabled={uploading}
                className="group relative flex aspect-[4/5] max-h-[42svh] w-full max-w-[320px] sm:max-w-[360px] mx-auto flex-col items-center justify-center rounded-card border-2 border-dashed border-line bg-linear-to-b from-surface/80 to-ink p-6 text-center transition-all duration-200 hover:border-champagne/50 hover:bg-surface disabled:opacity-50 shadow-sm cursor-pointer select-none"
              >
                <span className="animate-halo mb-4 grid size-16 place-items-center rounded-2xl bg-champagne/10 text-champagne transition-transform duration-200 group-hover:scale-105">
                  <Camera className="size-7" aria-hidden />
                </span>
                <span className="text-[15.5px] font-semibold text-cream">
                  {uploading ? t("upload.adding") : t("upload.addPhoto")}
                </span>
                <span className="mt-1.5 text-[12.5px] text-muted">
                  {t("upload.fileHint", { max: MAX_MB })}
                </span>
              </button>
            )}
          </div>

          {error && (
            <p className="mt-3 flex items-center justify-center sm:justify-start gap-2 text-[13px] leading-relaxed text-danger-soft mx-auto sm:mx-0">
              <X className="size-3.5 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          {/* Action buttons centered with card */}
          <div className="mt-5 grid grid-cols-2 gap-3 w-full max-w-[320px] sm:max-w-[360px] mx-auto sm:mx-0">
            <Button variant="secondary" size="md" className="w-full justify-center" onClick={() => cameraRef.current?.click()}>
              <Camera className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{t("upload.takePhoto")}</span>
            </Button>
            <Button variant="secondary" size="md" className="w-full justify-center" onClick={() => galleryRef.current?.click()}>
              <ImageIcon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{t("upload.chooseGallery")}</span>
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

        {/* Right column: Guidance */}
        <div className="mt-8 lg:mt-0">
          <Card className="p-5 sm:p-6 shadow-sm">
            <p className="eyebrow mb-4">{t("upload.guideTitle")}</p>
            <div className="grid grid-cols-2 gap-3 max-w-[320px] sm:max-w-none mx-auto">
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

          <p className="mt-4 flex items-center justify-center sm:justify-start gap-2 px-1 text-[12px] leading-relaxed text-faint">
            <Lock className="size-3.5 shrink-0" aria-hidden />
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
    <figure className="text-center">
      <ImageFrame
        src={src}
        alt={label}
        className="rounded-2xl mx-auto"
        imgClassName={good ? "object-[center_20%]" : "object-[center_20%] opacity-40 blur-[2px] brightness-50"}
      />
      <figcaption
        className={`mt-2 text-center font-mono text-[10px] tracking-[0.14em] uppercase ${
          good ? "text-champagne font-semibold" : "text-faint"
        }`}
      >
        {label}
      </figcaption>
    </figure>
  );
}
