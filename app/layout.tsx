import type { Metadata, Viewport } from "next";
import { Inter, Nunito } from "next/font/google";
import { GlowProvider } from "@/lib/state/GlowContext";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// The Sophisticated Playful theme's only face, loaded across the full 400–900
// range: the design leans on Black for headings and Bold for 10px labels.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Glowzen — See your glow-up before you commit",
  description:
    "Find the changes that will make the biggest difference to your appearance — and see them before you make them.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Glowzen" },
  // Icons come from the file convention: app/favicon.ico (16/32/48),
  // app/icon.svg (scalable) and app/apple-icon.png (180). Declaring them here
  // too would only duplicate the link tags.
};

export const viewport: Viewport = {
  themeColor: "#eeebe3",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="theme-sp min-h-full">
        <GlowProvider>
          <ToastProvider>{children}</ToastProvider>
        </GlowProvider>
      </body>
    </html>
  );
}
