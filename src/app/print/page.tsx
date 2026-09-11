import type { Metadata } from "next";
import RunSheetClient from "./RunSheetClient";

export const metadata: Metadata = {
  title: "Running Order",
  robots: { index: false, follow: false },
};

export default function PrintPage() {
  return <RunSheetClient />;
}
