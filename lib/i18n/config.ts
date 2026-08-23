/**
 * The seven languages the product ships in.
 *
 * Chosen for where an appearance app actually sells: the Americas (en, es,
 * pt-BR), Western Europe (fr, de), the Gulf (ar — the highest per-head grooming
 * spend anywhere, and the one right-to-left script we support), and Japan (the
 * third-largest beauty market in the world).
 *
 * Adding an eighth is three steps: a row here, a dictionary beside en.ts, and a
 * line in dictionaries/index.ts. Nothing else in the app knows the list.
 */

export const LOCALES = [
  "en",
  "es",
  "pt",
  "fr",
  "de",
  "ar",
  "ja",
] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export interface LocaleMeta {
  /** Our key, and the value stored against the user. */
  code: Locale;
  /** BCP-47 tag for `<html lang>` and every Intl call. */
  tag: string;
  /** How speakers write the name of their own language. */
  native: string;
  /** The same name in English, for a picker read by a non-speaker. */
  english: string;
  dir: "ltr" | "rtl";
  /**
   * The name the model is told to write in. Spelled the way the language names
   * itself, plus the region where it changes the wording — "Brazilian
   * Portuguese" and "European Portuguese" are not the same product.
   */
  aiName: string;
  /** Shown in the picker. A region, not a nationality test. */
  flag: string;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: {
    code: "en",
    tag: "en",
    native: "English",
    english: "English",
    dir: "ltr",
    aiName: "English",
    flag: "🇬🇧",
  },
  es: {
    code: "es",
    tag: "es",
    native: "Español",
    english: "Spanish",
    dir: "ltr",
    aiName: "Spanish (neutral Latin American Spanish, using tú)",
    flag: "🇪🇸",
  },
  pt: {
    code: "pt",
    tag: "pt-BR",
    native: "Português",
    english: "Portuguese",
    dir: "ltr",
    aiName: "Brazilian Portuguese (using você)",
    flag: "🇧🇷",
  },
  fr: {
    code: "fr",
    tag: "fr",
    native: "Français",
    english: "French",
    dir: "ltr",
    aiName: "French (using tu, not vous — this is a personal app)",
    flag: "🇫🇷",
  },
  de: {
    code: "de",
    tag: "de",
    native: "Deutsch",
    english: "German",
    dir: "ltr",
    aiName: "German (using du, not Sie — this is a personal app)",
    flag: "🇩🇪",
  },
  ar: {
    code: "ar",
    tag: "ar",
    native: "العربية",
    english: "Arabic",
    dir: "rtl",
    aiName: "Modern Standard Arabic",
    flag: "🇸🇦",
  },
  ja: {
    code: "ja",
    tag: "ja",
    native: "日本語",
    english: "Japanese",
    dir: "ltr",
    aiName: "Japanese (polite です・ます form)",
    flag: "🇯🇵",
  },
};

/** Cookie so the server can render `lang` and `dir` on the very first paint. */
export const LOCALE_COOKIE = "glow_locale";

/** localStorage, so a signed-out visitor keeps their choice too. */
export const LOCALE_STORAGE_KEY = "glow.locale.v1";

/** Header the browser puts the choice in when calling our own API routes. */
export const LOCALE_HEADER = "x-glow-locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function coerceLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Best match for an Accept-Language header, so a first-time visitor from São
 * Paulo doesn't have to go looking for the picker. Exact tag first, then the
 * base language, then English.
 */
export function matchLocale(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q.split("=")[1]) || 0 : 1 };
    })
    .filter((r) => r.tag)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const exact = LOCALES.find((l) => LOCALE_META[l].tag.toLowerCase() === tag);
    if (exact) return exact;
    const base = tag.split("-")[0];
    const loose = LOCALES.find((l) => l === base);
    if (loose) return loose;
  }

  return DEFAULT_LOCALE;
}
