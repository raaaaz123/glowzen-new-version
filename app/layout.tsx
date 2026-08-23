import type { Metadata, Viewport } from "next";
import { Inter, Nunito } from "next/font/google";
import { GlowProvider } from "@/lib/state/GlowContext";
import { ToastProvider } from "@/components/ui/Toast";
import { I18nProvider } from "@/lib/i18n/I18nContext";
import { LOCALE_META } from "@/lib/i18n/config";
import { requestLocale } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/translate";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// The Sophisticated Playful theme's only face, loaded across the full 400–900
// range: the design leans on Black for headings and Bold for 10px labels.
//
// Latin only. Arabic and Japanese have no coverage in either family, so those
// two fall through to the system stack in globals.css, which is what a reader
// of those scripts expects to see anyway — Noto Sans Arabic and Hiragino
// render their own script far better than a Latin face's fallback would.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

/** Title and description follow the reader's language, like everything else. */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale();
  const t = (path: string) => translate(locale, path);
  const name = t("common.appName");

  return {
    title: `${name} — ${t("welcome.subtitle")}`,
    description: t("welcome.mirrorHeading"),
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: name },
    // Icons come from the file convention: app/favicon.ico (16/32/48),
    // app/icon.svg (scalable) and app/apple-icon.png (180). Declaring them here
    // too would only duplicate the link tags.
  };
}

export const viewport: Viewport = {
  themeColor: "#eeebe3",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await requestLocale();
  const meta = LOCALE_META[locale];

  return (
    <html
      lang={meta.tag}
      dir={meta.dir}
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="theme-sp min-h-full">
        <I18nProvider initialLocale={locale}>
          <GlowProvider>
            <ToastProvider>{children}</ToastProvider>
          </GlowProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
