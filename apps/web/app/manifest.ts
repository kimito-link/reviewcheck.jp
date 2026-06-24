import type { MetadataRoute } from "next";
import { SITE } from "@reviewcheck/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: "口コミチェック",
    description: SITE.defaultDescription,
    start_url: "/check/",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#1a365d",
    lang: "ja",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
