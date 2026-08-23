import "server-only";

import { LOCALE_HEADER, coerceLocale, type Locale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/translate";
import type { Vars } from "@/lib/i18n/translate";

/**
 * The language for one API request.
 *
 * The body carries it, because that's where the rest of the call's inputs are;
 * a header is accepted as a fallback so a route that takes no body still gets
 * it. An unknown or missing value falls back to English rather than failing —
 * a locale is not something to reject a paid analysis over.
 */
export function requestLocale(request: Request, body?: { locale?: unknown }): Locale {
  return coerceLocale(body?.locale ?? request.headers.get(LOCALE_HEADER));
}

/** Route-level `t`, sharing the same dictionaries the browser reads. */
export function serverT(locale: Locale) {
  return (path: string, vars?: Vars) => translate(locale, path, vars);
}
