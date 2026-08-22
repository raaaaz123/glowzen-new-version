import type { MetadataRoute } from "next";

/** Installed to a home screen, Glowzen should open like an app, not a tab. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Glowzen",
    short_name: "Glowzen",
    description:
      "Find the changes that will make the biggest difference to your appearance — and see them before you make them.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0a0e",
    theme_color: "#0b0a0e",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
