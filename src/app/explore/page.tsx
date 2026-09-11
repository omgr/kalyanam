import type { Metadata } from "next";
import ExploreClient from "./ExploreClient";

export const metadata: Metadata = {
  title: "Features - Wedding Events, Guests, Budget and Vendors",
  description:
    "Everything Kalyanam does: ceremony planning from cultural templates, guest lists and RSVPs, budget and installment tracking, vendor management, shared task lists and reminders. Private by default, stored on your own device.",
  alternates: { canonical: "/explore" },
};

export default function ExplorePage() {
  return <ExploreClient />;
}
