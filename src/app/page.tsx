import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  // absolute: this page is the brand landing page, so no "| Kalyanam" suffix
  title: {
    absolute: "Kalyanam - Free Indian Wedding Planner with Cultural Ritual Templates",
  },
  description:
    "Plan an Indian wedding with ready-made ritual templates for Telugu Brahmin, South Indian, North Indian, Muslim and Christian ceremonies. Track events, guests, budget and vendors. Free, private, works offline - no account needed.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <HomeClient />;
}
