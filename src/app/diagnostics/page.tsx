import type { Metadata } from "next";
import DiagnosticsClient from "./DiagnosticsClient";

export const metadata: Metadata = {
  title: "Diagnostics",
  robots: { index: false, follow: false },
};

export default function DiagnosticsPage() {
  return <DiagnosticsClient />;
}
