import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/app-url";

const appUrl = getAppUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/landing",
        "/about",
        "/guide/",
        "/privacy",
        "/terms",
        "/icons/",
        "/og-image.svg",
        "/manifest.webmanifest",
      ],
      disallow: ["/api/", "/auth", "/children", "/family", "/fridge", "/meal", "/mypage", "/recipe"],
    },
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
