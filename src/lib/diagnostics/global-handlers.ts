/**
 * Catch-all logging for things nobody thought to instrument.
 *
 * Per-feature logging only records what someone predicted would matter. A
 * crash in an unlogged corner, a failed request, a database that will not
 * open - those are exactly the failures that leave a family staring at a blank
 * screen with nothing to send on. These handlers make sure something is
 * written down regardless.
 */

import { logError, logWarn, logInfo, prune } from "./logger";

let installed = false;

export function installGlobalDiagnostics(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    void logError("app", "uncaught error", {
      reason: event.message,
      where: `${event.filename?.split("/").pop() ?? "?"}:${event.lineno}`,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    void logError("app", "unhandled promise rejection", {
      reason:
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "unknown",
    });
  });

  // Losing and regaining the network explains a great deal about sync.
  window.addEventListener("online", () => void logInfo("app", "back online"));
  window.addEventListener("offline", () => void logWarn("app", "went offline"));

  // Backgrounding is why sync stops, and it is the first thing to check when
  // someone says "it didn't update while I was away".
  document.addEventListener("visibilitychange", () => {
    void logInfo("app", document.hidden ? "app backgrounded" : "app foregrounded");
  });

  void logInfo("app", "app started", {
    standalone: window.matchMedia?.("(display-mode: standalone)").matches === true,
    online: navigator.onLine,
  });

  // Trim on every start, so a long-running install cannot accumulate.
  void prune();
}
