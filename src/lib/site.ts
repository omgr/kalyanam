/**
 * Canonical site location, used for metadata, sitemap and robots.
 *
 * Override SITE_URL at build time when moving to a custom domain - a real
 * domain is worth a lot more for search than a github.io project path.
 */
const repo = process.env.GITHUB_PAGES_REPO || "";

export const basePath = repo ? `/${repo}` : "";

export const siteUrl = (
  process.env.SITE_URL || `https://omgr.github.io${basePath}`
).replace(/\/$/, "");

/** Pages that are useful to a search engine. App screens behind the planner are not. */
export const publicRoutes = ["/", "/explore", "/cultures"];
