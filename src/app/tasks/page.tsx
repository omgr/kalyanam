import { Suspense } from "react";
import TasksClient from "./TasksClient";

// TasksClient reads ?filter= via useSearchParams, which needs a Suspense
// boundary in a server component when the app is statically exported.
export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <TasksClient />
    </Suspense>
  );
}
