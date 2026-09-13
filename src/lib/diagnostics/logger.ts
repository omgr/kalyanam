/**
 * An on-device diagnostic log.
 *
 * A browser cannot write to a folder of its own choosing, so the log lives in
 * IndexedDB and is exported as a file on request. The exported filename carries
 * the device and the date, so the right one can be found in Downloads and sent
 * on without anybody hunting.
 *
 * PRIVACY RULE, and it is not negotiable: this file is meant to be sent to
 * someone else, so it must never contain wedding content. No guest names, no
 * phone numbers, no messages, no venue addresses, no invite secrets. Log what
 * happened and to how many records - never what the records say. `redact`
 * below is the last line of defence, not the first.
 */

import { db, type LogEntry } from "@/lib/db/schema";
import { generateId } from "@/lib/utils";

export const DEVICE_NAME_KEY = "kalyanam_device_name";

/** A name the owner gave this device, if any. */
export function getDeviceName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DEVICE_NAME_KEY);
}

export function setDeviceName(name: string): void {
  const trimmed = name.trim();
  if (trimmed) localStorage.setItem(DEVICE_NAME_KEY, trimmed);
  else localStorage.removeItem(DEVICE_NAME_KEY);
}

/**
 * Days of history to keep.
 *
 * A fresh log starts each day and old ones are dropped, so this cannot grow
 * without bound on a phone that is short of space. Three days covers "it
 * happened yesterday" without hoarding.
 */
export const RETENTION_DAYS = 3;

/** Per-day cap, so a runaway loop cannot fill the device. */
export const MAX_ENTRIES_PER_DAY = 2000;

export type LogLevel = LogEntry["level"];

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Keys whose values must never be written, whatever the caller passes. */
const FORBIDDEN_KEYS =
  /name|phone|email|address|message|content|secret|invite|token|title|venue|guest/i;

/**
 * Strip anything that could carry wedding content.
 *
 * Callers are expected to pass counts and codes. This catches mistakes: a key
 * that looks personal is replaced rather than trusted, and long strings are
 * truncated in case something slips through under an innocuous name.
 */
export function redact(detail: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!detail) return undefined;
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(detail)) {
    if (FORBIDDEN_KEYS.test(key)) {
      safe[key] = "[redacted]";
    } else if (typeof value === "string") {
      safe[key] = value.length > 120 ? `${value.slice(0, 120)}...` : value;
    } else if (value === null || ["number", "boolean", "undefined"].includes(typeof value)) {
      safe[key] = value;
    } else {
      // Objects and arrays are summarised rather than serialised wholesale.
      safe[key] = Array.isArray(value) ? `[${value.length} items]` : "[object]";
    }
  }
  return safe;
}

let pruned = false;

/** Record something that happened. Never throws - logging must not break a feature. */
export async function log(
  level: LogLevel,
  area: string,
  message: string,
  detail?: Record<string, unknown>
): Promise<void> {
  try {
    if (typeof indexedDB === "undefined") return;

    const entry: LogEntry = {
      id: generateId(),
      day: today(),
      at: new Date(),
      level,
      area,
      message,
      detail: redact(detail),
    };

    await db.logs.add(entry);

    // Also surface in the console, which is where a developer looks first.
    const line = `[${area}] ${message}`;
    if (level === "error") console.error(line, detail ?? "");
    else if (level === "warn") console.warn(line, detail ?? "");

    if (!pruned) {
      pruned = true;
      void prune();
    }
  } catch {
    // A failure to log is not worth surfacing to someone planning a wedding.
  }
}

export const logInfo = (area: string, message: string, detail?: Record<string, unknown>) =>
  log("info", area, message, detail);
export const logWarn = (area: string, message: string, detail?: Record<string, unknown>) =>
  log("warn", area, message, detail);
export const logError = (area: string, message: string, detail?: Record<string, unknown>) =>
  log("error", area, message, detail);

/** Drop days beyond the retention window, and trim an oversized day. */
export async function prune(): Promise<void> {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    const cutoffDay = cutoff.toISOString().slice(0, 10);

    const old = await db.logs.where("day").below(cutoffDay).primaryKeys();
    if (old.length) await db.logs.bulkDelete(old);

    const todays = await db.logs.where("day").equals(today()).sortBy("at");
    if (todays.length > MAX_ENTRIES_PER_DAY) {
      const excess = todays.slice(0, todays.length - MAX_ENTRIES_PER_DAY).map((e) => e.id);
      await db.logs.bulkDelete(excess);
    }
  } catch {
    /* best effort */
  }
}

/** Which days have entries, newest first. */
export async function availableDays(): Promise<string[]> {
  const all = await db.logs.orderBy("day").uniqueKeys();
  return (all as string[]).sort().reverse();
}

export async function entriesFor(day: string): Promise<LogEntry[]> {
  return db.logs.where("day").equals(day).sortBy("at");
}

/** Entries per feature area for a day, for the at-a-glance summary. */
export async function areaCounts(
  day: string
): Promise<Record<string, { total: number; problems: number }>> {
  const entries = await entriesFor(day);
  const counts: Record<string, { total: number; problems: number }> = {};

  for (const entry of entries) {
    const bucket = (counts[entry.area] ??= { total: 0, problems: 0 });
    bucket.total++;
    if (entry.level !== "info") bucket.problems++;
  }
  return counts;
}

/** Rough size of the stored log, so the cost of keeping it is visible. */
export async function storageUsedKb(): Promise<number> {
  try {
    const all = await db.logs.toArray();
    const bytes = all.reduce(
      (sum, e) => sum + e.message.length + JSON.stringify(e.detail ?? {}).length + 80,
      0
    );
    return Math.round(bytes / 1024);
  } catch {
    return 0;
  }
}

export async function clearLogs(): Promise<void> {
  await db.logs.clear();
}

// ---------------------------------------------------------------------------
// Device description
// ---------------------------------------------------------------------------

export interface DeviceInfo {
  label: string;
  /** True when the label is a guess, so the UI can prompt for a real name. */
  labelIsGeneric: boolean;
  userAgent: string;
  platform: string;
  screen: string;
  language: string;
  online: boolean;
  network?: string;
  standalone: boolean;
  storageEstimateMb?: number;
}

/**
 * A human-recognisable name for the device, so two log files can be told apart.
 *
 * Derived from the user agent rather than asked for, because nobody wants a
 * setup step before they can report a bug - but recent Chrome on Android
 * reports the model as a literal "K" in its reduced user agent, so every
 * Android phone in a family produces the same name and the same filename. When
 * that happens the owner is asked to name the device instead.
 */
export function deviceLabel(ua = typeof navigator !== "undefined" ? navigator.userAgent : ""): string {
  const given = getDeviceName();
  if (given) return given;

  // Android puts the model in the build token: "...; SM-S911B Build/..."
  const android = ua.match(/Android[^;]*;\s*([^;)]+?)(?:\s+Build\/|\))/);
  if (android) {
    const model = android[1].trim();
    // "K" is Chrome's placeholder, not a model. Anything that short is useless
    // for telling two phones apart.
    return model.length > 1 && model !== "K" ? model : "Android phone";
  }
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown device";
}

export async function describeDevice(): Promise<DeviceInfo> {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string };
    standalone?: boolean;
  };

  let storageEstimateMb: number | undefined;
  try {
    const estimate = await navigator.storage?.estimate?.();
    if (estimate?.usage) storageEstimateMb = Math.round(estimate.usage / 1024 / 1024);
  } catch {
    /* not available everywhere */
  }

  // Every lookup here is defensive. This runs when something has already gone
  // wrong, so it must not be the thing that throws - a browser missing
  // matchMedia should cost us one field, not the whole report.
  const safely = <T>(read: () => T, fallback: T): T => {
    try {
      return read() ?? fallback;
    } catch {
      return fallback;
    }
  };

  const label = safely(() => deviceLabel(), "Unknown device");

  return {
    label,
    labelIsGeneric: !getDeviceName() && ["Android phone", "Unknown device"].includes(label),
    userAgent: safely(() => navigator.userAgent, "unknown"),
    platform: safely(() => nav.platform, "unknown"),
    screen: safely(
      () => `${window.screen.width}x${window.screen.height} @${window.devicePixelRatio}x`,
      "unknown"
    ),
    language: safely(() => navigator.language, "unknown"),
    online: safely(() => navigator.onLine, true),
    network: safely(() => nav.connection?.effectiveType, undefined),
    standalone: safely(
      () =>
        nav.standalone === true ||
        window.matchMedia?.("(display-mode: standalone)").matches === true,
      false
    ),
    storageEstimateMb,
  };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/** `kalyanam-log-SM-S911B-2026-09-13.txt` */
export function logFilename(day: string, label: string): string {
  const safe = label.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "device";
  return `kalyanam-log-${safe}-${day}.txt`;
}

/** A whole day as plain text, with a header describing the device. */
export async function buildLogFile(day: string): Promise<{ filename: string; text: string }> {
  const [device, entries] = await Promise.all([describeDevice(), entriesFor(day)]);

  const header = [
    "Kalyanam diagnostic log",
    "=======================",
    `Day          : ${day}`,
    `Device       : ${device.label}`,
    `Platform     : ${device.platform}`,
    `Screen       : ${device.screen}`,
    `Language     : ${device.language}`,
    `Network      : ${device.network ?? "unknown"}${device.online ? "" : " (offline)"}`,
    `Installed app: ${device.standalone ? "yes" : "no (browser tab)"}`,
    `Storage used : ${device.storageEstimateMb ?? "?"} MB`,
    `App version  : ${process.env.APP_VERSION ?? "unknown"}`,
    `User agent   : ${device.userAgent}`,
    `Entries      : ${entries.length}`,
    "",
    "This log contains no guest names, phone numbers or message content.",
    "",
    "".padEnd(72, "-"),
  ].join("\n");

  const body = entries
    .map((e) => {
      const time = new Date(e.at).toISOString().slice(11, 23);
      const detail = e.detail && Object.keys(e.detail).length ? ` ${JSON.stringify(e.detail)}` : "";
      return `${time} ${e.level.toUpperCase().padEnd(5)} [${e.area}] ${e.message}${detail}`;
    })
    .join("\n");

  return {
    filename: logFilename(day, device.label),
    text: `${header}\n${body || "(no entries)"}\n`,
  };
}
