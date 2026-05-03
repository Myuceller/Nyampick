import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
