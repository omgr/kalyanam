import CultureDetailClient from "./CultureDetailClient";
import { allCultures } from "@/lib/cultures";

// Generate static params for all cultures (they're known at build time)
export function generateStaticParams() {
  return allCultures.map((culture) => ({
    id: culture.id,
  }));
}

export default function CultureDetailPage({ params }: { params: { id: string } }) {
  return <CultureDetailClient cultureId={params.id} />;
}
