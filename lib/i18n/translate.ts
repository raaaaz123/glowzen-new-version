import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { DEFAULT_LOCALE, LOCALE_META, type Locale } from "@/lib/i18n/config";
import { dictionaryFor } from "@/lib/i18n/dictionaries";

export type Vars = Record<string, string | number>;

/**
 * Dot path into a dictionary. Missing keys fall through to English rather than
 * rendering blank — a half-translated string is still readable, an empty
 * button is not.
 */
function lookup(dict: Dictionary, path: string): unknown {
  let node: unknown = dict;
  for (const part of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/** `{name}` → the value passed in. An unmatched brace is left alone. */
function fill(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in vars ? String(vars[key]) : whole,
  );
}

export function translate(locale: Locale, path: string, vars?: Vars): string {
  const value = lookup(dictionaryFor(locale), path);
  if (typeof value === "string") return fill(value, vars);

  const fallback = lookup(dictionaryFor(DEFAULT_LOCALE), path);
  if (typeof fallback === "string") {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[glowzen i18n] "${path}" is missing from ${locale}.`);
    }
    return fill(fallback, vars);
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn(`[glowzen i18n] "${path}" is not a string in any dictionary.`);
  }
  return path;
}

/** Intl helpers, so a date or a percentage reads the way the locale writes it. */
export function formatDate(
  locale: Locale,
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions,
) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(LOCALE_META[locale].tag, options).format(date);
}

export function formatNumber(locale: Locale, value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(LOCALE_META[locale].tag, options).format(value);
}

/** Short "22 Aug" style label used on every scan row and check-in tile. */
export const shortDate = (locale: Locale, value: string | number | Date) =>
  formatDate(locale, value, { day: "numeric", month: "short" });

/** Long "22 August 2026" label for a stored analysis. */
export const longDate = (locale: Locale, value: string | number | Date) =>
  formatDate(locale, value, { day: "numeric", month: "long", year: "numeric" });
