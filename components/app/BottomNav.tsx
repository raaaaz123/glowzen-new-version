"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, House, Scan, TrendingUp, UserRound } from "lucide-react";
import { useT } from "@/lib/i18n/I18nContext";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/home", labelKey: "nav.home", icon: House },
  { href: "/analyze", labelKey: "nav.analyze", icon: Scan },
  { href: "/plan", labelKey: "nav.plan", icon: CalendarCheck },
  { href: "/progress", labelKey: "nav.progress", icon: TrendingUp },
  { href: "/profile", labelKey: "nav.profile", icon: UserRound },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const isActive = useActive();
  const t = useT();

  return (
    <nav
      aria-label={t("nav.main")}
      className="safe-b fixed inset-x-0 bottom-0 z-50 border-t border-line bg-ink/85 backdrop-blur-2xl lg:hidden"
    >
      <ul className="shell flex items-stretch justify-between px-2 pt-2 pb-1">
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="group flex flex-col items-center gap-1 rounded-xl py-1.5"
              >
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-xl transition-colors duration-200",
                    active ? "bg-champagne/12 text-champagne" : "text-faint group-hover:text-muted",
                  )}
                >
                  <Icon className="size-[19px]" strokeWidth={active ? 2.1 : 1.7} aria-hidden />
                </span>
                <span
                  className={cn(
                    "text-[10px] tracking-[0.02em] transition-colors",
                    active ? "text-cream" : "text-faint",
                  )}
                >
                  {t(labelKey)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideRail() {
  const isActive = useActive();
  const t = useT();

  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col justify-between border-e border-line py-8 pe-6 lg:flex">
      <div>
        <Link href="/" className="mb-10 flex items-center gap-2.5 px-3 group">
          <span className="grid size-8 place-items-center rounded-xl bg-linear-to-b from-champagne-hi to-champagne text-[13px] font-semibold text-on-accent transition-transform duration-200 group-hover:scale-105">
            G
          </span>
          <span className="type-display text-xl transition-colors group-hover:text-champagne">{t("common.appName")}</span>
        </Link>

        <nav aria-label={t("nav.main")}>
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors duration-200",
                      active
                        ? "bg-raised text-cream"
                        : "text-muted hover:bg-raised/60 hover:text-cream",
                    )}
                  >
                    <Icon
                      className={cn("size-[18px]", active && "text-champagne")}
                      strokeWidth={1.8}
                      aria-hidden
                    />
                    {t(labelKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <p className="px-3 text-[11px] leading-relaxed text-faint">{t("common.aiShort")}</p>
    </aside>
  );
}
