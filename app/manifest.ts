import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Farm2Door — Farm to Door Marketplace",
    short_name: "Farm2Door",
    description: "Direct farm-to-door digital marketplace connecting verified Ekiti smallholder farmers with fresh produce buyers.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF8F2",
    theme_color: "#0D2E1C",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    categories: ["shopping", "business", "food"],
  };
}
