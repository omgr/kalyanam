import EventsClient from "./EventsClient";

// For optional catch-all with static export, we need to provide the base route
// The empty slug array represents /events (the base route)
export function generateStaticParams() {
  return [
    { slug: [] },          // /events
    { slug: ['new'] },     // /events/new
  ];
}

export default function EventsPage() {
  return <EventsClient />;
}
