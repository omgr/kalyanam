import type { Metadata } from "next";
import CultureDetailClient from "./CultureDetailClient";
import { allCultures } from "@/lib/cultures";

// Generate static params for all cultures (they're known at build time)
export function generateStaticParams() {
  return allCultures.map((culture) => ({
    id: culture.id,
  }));
}

/**
 * These pages carry the richest content on the site - every ritual, its
 * significance and the items it needs - so each gets its own title,
 * description and canonical URL rather than inheriting the site-wide defaults.
 */
export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const culture = allCultures.find((c) => c.id === params.id);
  if (!culture) return { title: "Wedding Traditions" };

  const ritualNames = culture.rituals.slice(0, 6).map((r) => r.name).join(", ");

  return {
    title: `${culture.name} Wedding Rituals & Ceremony Checklist`,
    description:
      `All ${culture.rituals.length} ceremonies in a ${culture.name} wedding, including ${ritualNames}. ` +
      `Each ritual explained with its significance, timing and the items you need to prepare.`,
    keywords: [
      `${culture.name} wedding`,
      `${culture.name} wedding rituals`,
      `${culture.name} marriage ceremony`,
      ...culture.rituals.slice(0, 10).map((r) => r.name),
    ],
    alternates: { canonical: `/cultures/${culture.id}` },
    openGraph: {
      title: `${culture.name} Wedding Rituals & Ceremony Checklist`,
      description: `All ${culture.rituals.length} ceremonies in a ${culture.name} wedding, explained.`,
      type: "article",
    },
  };
}

export default function CultureDetailPage({ params }: { params: { id: string } }) {
  const culture = allCultures.find((c) => c.id === params.id);

  // Structured data helps search engines understand these as reference pages
  // about a specific tradition rather than as generic app screens.
  const jsonLd = culture
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: `${culture.name} Wedding Rituals and Ceremonies`,
        description: culture.description,
        about: { "@type": "Thing", name: `${culture.name} wedding traditions` },
        articleSection: "Wedding Traditions",
        hasPart: culture.rituals.map((r) => ({
          "@type": "HowToSection",
          name: r.name,
          description: r.description || r.significance,
        })),
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <CultureDetailClient cultureId={params.id} />
    </>
  );
}
