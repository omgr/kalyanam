import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // These render only from data held on the visitor's own device, so there
      // is nothing for a crawler to read and nothing we want indexed.
      disallow: [
        "/dashboard",
        "/events",
        "/guests",
        "/tasks",
        "/budget",
        "/vendors",
        "/family",
        "/messages",
        "/location",
        "/reminders",
        "/sync",
        "/settings",
        "/login",
        "/onboarding",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
