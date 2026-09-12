import type { MetadataRoute } from "next";
import { siteUrl, basePath } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // These render only from data held on the visitor's own device, so there
      // is nothing for a crawler to read and nothing we want indexed.
      // Paths in robots.txt are relative to the ORIGIN, not to the site, so on
      // a project site they need the base path. Note that a crawler reads
      // https://omgr.github.io/robots.txt rather than this file - on github.io
      // this is advisory only, and it becomes authoritative on a custom domain.
      disallow: [
        "dashboard", "events", "guests", "tasks", "budget", "vendors",
        "family", "messages", "location", "reminders", "sync", "settings",
        "login", "onboarding", "print",
      ].map((route) => `${basePath}/${route}`),
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
