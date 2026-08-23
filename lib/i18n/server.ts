import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, coerceLocale, matchLocale, type Locale } from "@/lib/i18n/config";
import { translate, type Vars } from "@/lib/i18n/translate";

/**
 * The locale for the request being rendered.
 *
 * The cookie is the user's own choice and always wins. With no cookie — a first
 * visit — Accept-Language is the best guess available, and it lets someone in
 * Lyon land on French rather than on English they then have to change. The
 * client re-checks both on mount and corrects the cookie if it disagrees.
 *
 * Reading either of these opts the tree into dynamic rendering. Nothing here is
 * statically generated anyway: every screen is a client component reading the
 * user's own stored session.
 */
export async function requestLocale(): Promise<Locale> {
  const jar = await cookies();
  const chosen = jar.get(LOCALE_COOKIE)?.value;
  if (chosen) return coerceLocale(chosen);

  const head = await headers();
  return matchLocale(head.get("accept-language"));
}

/** `t` for server components and metadata. */
export async function serverT() {
  const locale = await requestLocale();
  return (path: string, vars?: Vars) => translate(locale, path, vars);
}
