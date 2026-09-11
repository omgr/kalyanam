import type { Metadata } from "next";
import CulturesClient from "./CulturesClient";

export const metadata: Metadata = {
  title: "Indian Wedding Ritual Templates by Culture",
  description:
    "Browse complete ceremony checklists for Telugu Brahmin, South Indian, North Indian, Muslim and Christian weddings. See every ritual, its significance and the items you need to prepare.",
  alternates: { canonical: "/cultures" },
};

export default function CulturesPage() {
  return <CulturesClient />;
}
