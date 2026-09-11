import { Suspense } from "react";
import EventsClient from "./EventsClient";

// Event ids only exist at runtime, so only the fixed routes can be prerendered.
// Detail and edit views are addressed with a query string on /events instead
// (see parseRoute in EventsClient) so they never hit a missing static file.
export function generateStaticParams() {
  return [
    { slug: [] },          // /events            - list, detail (?id=), edit (?id=&edit=1)
    { slug: ['new'] },     // /events/new        - create
  ];
}

export default function EventsPage() {
  // useSearchParams needs a Suspense boundary when the page is statically exported.
  return (
    <Suspense fallback={null}>
      <EventsClient />
    </Suspense>
  );
}
