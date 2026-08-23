import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { translate, longDate, shortDate, type Vars } from "@/lib/i18n/translate";

/**
 * The locale as a plain module value, for the code that isn't a React
 * component: services, thrown errors, the labels built inside
 * `progressService`. `<I18nProvider>` keeps this in step with the state it
 * renders from, so the two never disagree.
 *
 * Components must not read this — they read `useI18n()`, which re-renders when
 * the language changes. This is for the callers that have no render to hook.
 */
let current: Locale = DEFAULT_LOCALE;

export function setRuntimeLocale(locale: Locale) {
  current = locale;
}

export function getRuntimeLocale(): Locale {
  return current;
}

/** `t` for non-component code. */
export function st(path: string, vars?: Vars) {
  return translate(current, path, vars);
}

export const stShortDate = (value: string | number | Date) => shortDate(current, value);
export const stLongDate = (value: string | number | Date) => longDate(current, value);
