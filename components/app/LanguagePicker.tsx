"use client";

import { Check, Globe } from "lucide-react";
import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/I18nContext";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * The picker itself. Every language is written in its own script — someone
 * looking for their language is not reading the one they're stuck in, so
 * "Deutsch" has to be findable without knowing the word "German".
 */
function LanguageList({ onPicked }: { onPicked?: (locale: Locale) => void }) {
  const { locale, setLocale, t } = useI18n();
  const toast = useToast();

  function choose(next: Locale) {
    setLocale(next);
    // In the language they just switched to, which is the point.
    toast(
      // The provider's state update and this render are the same commit, so
      // `t` here is still the old language — name the new one explicitly.
      `${LOCALE_META[next].native} · ${t("language.changed", { language: LOCALE_META[next].native })}`,
    );
    onPicked?.(next);
  }

  return (
    <ul className="space-y-1.5 pb-2">
      {LOCALES.map((code) => {
        const meta = LOCALE_META[code];
        const active = code === locale;
        return (
          <li key={code}>
            <button
              onClick={() => choose(code)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-start transition-colors",
                active
                  ? "border-champagne/50 bg-champagne/8"
                  : "border-line hover:border-champagne/30 hover:bg-cream/[.03]",
              )}
            >
              <span className="text-[20px] leading-none" aria-hidden>
                {meta.flag}
              </span>
              <span className="min-w-0 flex-1">
                {/* The name in its own script leads. Its own direction too —
                    Arabic set left-to-right inside an English list reads as a
                    bug to anyone who can actually read it. */}
                <span className="block text-[15px] font-medium" dir={meta.dir} lang={meta.tag}>
                  {meta.native}
                </span>
                <span className="mt-0.5 block text-[12.5px] text-muted">{meta.english}</span>
              </span>
              {active && (
                <Check className="size-4 shrink-0 text-champagne" strokeWidth={2.6} aria-hidden />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The compact control for the welcome screen — a globe and the current
 * language's own name, so a visitor who landed in the wrong one can see the way
 * out without reading a word of it.
 */
export function LanguageButton({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const meta = LOCALE_META[locale];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("language.pickerLabel")}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-[13px] text-muted transition-colors hover:border-champagne/35 hover:text-cream",
          className,
        )}
      >
        <Globe className="size-3.5 shrink-0" aria-hidden />
        <span dir={meta.dir} lang={meta.tag}>
          {meta.native}
        </span>
      </button>

      <LanguageSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** The row form, for the settings list on Profile. */
export function LanguageRow() {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const meta = LOCALE_META[locale];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3.5 px-5 py-4 text-start transition-colors hover:bg-cream/[.03]"
      >
        <Globe className="size-[17px] shrink-0 text-muted" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] text-cream">{t("language.label")}</span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">
            {t("language.aiNote")}
          </span>
        </span>
        <span className="shrink-0 text-[14px] text-champagne" dir={meta.dir} lang={meta.tag}>
          {meta.native}
        </span>
      </button>

      <LanguageSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function LanguageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useI18n().t;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("language.title")}
      description={t("language.description")}
    >
      <LanguageList onPicked={onClose} />
    </Sheet>
  );
}
