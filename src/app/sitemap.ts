import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/app-url";

const appUrl = getAppUrl();

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const publicPages = [
    { path: "/", changeFrequency: "weekly" as const, priority: 1 },
    { path: "/about", changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/guide/baby-meal-planner", changeFrequency: "monthly" as const, priority: 0.85 },
    { path: "/guide/baby-meal-plan", changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/guide/baby-food-cube-storage", changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/guide/fridge-ingredient-management", changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
  ];

  return publicPages.map((page) => ({
    url: `${appUrl}${page.path}`,
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
