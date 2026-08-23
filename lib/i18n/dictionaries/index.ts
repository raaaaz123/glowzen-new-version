import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { en, type Dictionary } from "./en";
import { es } from "./es";
import { pt } from "./pt";
import { fr } from "./fr";
import { de } from "./de";
import { ar } from "./ar";
import { ja } from "./ja";

/**
 * All seven loaded up front. They are plain objects totalling a few tens of
 * kilobytes, and lazy-loading them would mean a flash of English on every
 * screen the moment the user switches.
 */
export const DICTIONARIES: Record<Locale, Dictionary> = { en, es, pt, fr, de, ar, ja };

export function dictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

export type { Dictionary };
