"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_META,
  LOCALE_STORAGE_KEY,
  coerceLocale,
  matchLocale,
  type Locale,
} from "@/lib/i18n/config";
import { formatDate, formatNumber, longDate, shortDate, translate, type Vars } from "@/lib/i18n/translate";
import { setRuntimeLocale } from "@/lib/i18n/runtime";
import { getUserDoc, saveLocale } from "@/services/userService";

interface I18nValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  /** BCP-47 tag, for anything that wants to call Intl itself. */
  tag: string;
  t: (path: string, vars?: Vars) => string;
  setLocale: (locale: Locale) => void;
  shortDate: (value: string | number | Date) => string;
  longDate: (value: string | number | Date) => string;
  formatDate: (value: string | number | Date, options: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  /** False until the stored choice has been read, like GlowContext's own flag. */
  hydrated: boolean;
}

const I18nContext = createContext<I18nValue | null>(null);

function readStored(): Locale | null {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored) return coerceLocale(stored);
  } catch {
    // Private mode. The cookie or the browser's own languages still work.
  }
  const cookie = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${LOCALE_COOKIE}=`));
  return cookie ? coerceLocale(decodeURIComponent(cookie.slice(LOCALE_COOKIE.length + 1))) : null;
}

/** A year, so a returning visitor never has to pick twice. */
function writeCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function I18nProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  /** What the server rendered with, read from the cookie. */
  initialLocale?: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [hydrated, setHydrated] = useState(false);

  // The module copy has to be right before any service runs, and services run
  // from effects in children — which fire before this component's own effects.
  if (typeof window === "undefined") setRuntimeLocale(initialLocale);

  useEffect(() => {
    // Order matters: an explicit choice beats the cookie, the cookie beats the
    // browser's languages, and the browser beats English.
    const local = readStored();
    const resolved =
      local ?? matchLocale(navigator.languages?.join(",") ?? navigator.language);
    setLocaleState(resolved);
    setRuntimeLocale(resolved);
    if (resolved !== initialLocale) writeCookie(resolved);
    setHydrated(true);

    // Only when this browser has no choice of its own: the stored preference is
    // for the user's *other* devices, and it must never overrule a picker tap
    // that already happened here.
    if (local) return;
    let cancelled = false;
    void getUserDoc()
      .then((remote) => {
        if (cancelled || !remote.locale || remote.locale === resolved) return;
        setLocaleState(remote.locale);
        setRuntimeLocale(remote.locale);
        writeCookie(remote.locale);
      })
      .catch(() => {
        // Signed out, or Firestore locked down. The local choice still stands.
      });
    return () => {
      cancelled = true;
    };
  }, [initialLocale]);

  // `lang` and `dir` live on <html>, which React does not own after hydration.
  useEffect(() => {
    const meta = LOCALE_META[locale];
    document.documentElement.lang = meta.tag;
    document.documentElement.dir = meta.dir;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setRuntimeLocale(next);
    writeCookie(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // The cookie already carries it; this is only for a cleared cookie jar.
    }
    // Follows the user to their next device. Failing is fine — it's a
    // preference, not their data.
    void saveLocale(next).catch(() => {});
  }, []);

  const value = useMemo<I18nValue>(() => {
    const meta = LOCALE_META[locale];
    return {
      locale,
      dir: meta.dir,
      tag: meta.tag,
      hydrated,
      t: (path, vars) => translate(locale, path, vars),
      setLocale,
      shortDate: (v) => shortDate(locale, v),
      longDate: (v) => longDate(locale, v),
      formatDate: (v, options) => formatDate(locale, v, options),
      formatNumber: (v, options) => formatNumber(locale, v, options),
    };
  }, [locale, hydrated, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

/** The common case: just the translate function. */
export function useT() {
  return useI18n().t;
}
