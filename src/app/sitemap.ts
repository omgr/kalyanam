import type { MetadataRoute } from "next";
import { allCultures } from "@/lib/cultures";
import { siteUrl, publicRoutes } from "@/lib/site";

/**
 * Only the public, content-bearing pages are listed. The planner screens
 * (dashboard, tasks, budget...) render nothing without local data on the
 * device, so submitting them would just hand search engines empty pages.
 */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    // Trailing slashes matter here. The site is exported with trailingSlash,
    // so /explore 301s to /explore/ - and a sitemap full of redirecting URLs
    // is rejected rather than followed. These must match the canonical each
    // page declares, exactly.
    ...publicRoutes.map((route) => ({
      url: `${siteUrl}${route === "/" ? "/" : `${route}/`}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: route === "/" ? 1 : 0.8,
    })),
    ...allCultures.map((culture) => ({
      url: `${siteUrl}/cultures/${culture.id}/`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.9,
    })),
  ];
}
