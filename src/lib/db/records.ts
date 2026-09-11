/**
 * Shared knowledge about the shape of stored records.
 *
 * JSON has no date type, so anything that leaves the database as text - a
 * backup file, a CRDT update - comes back with its Dates flattened to ISO
 * strings. Putting those straight into Dexie leaves the indexes holding a mix
 * of Date and string keys, which makes sorts and range queries unreliable.
 * Both the backup format and the sync bridge revive dates using these maps.
 */

/** Collections that belong to a wedding and are safe to replicate. */
export const SYNCED_TABLES = [
  "events",
  "guests",
  "tasks",
  "expenses",
  "budgetCategories",
  "vendors",
  "familyMembers",
  "reminders",
  "followUps",
  "venues",
  "paymentPlans",
] as const;

export type SyncedTable = (typeof SYNCED_TABLES)[number];

/**
 * Deliberately excluded from sync:
 *   messages        - duplicates what the family already does in WhatsApp
 *   locationPings   - ephemeral and privacy-sensitive
 *   locationRequests- same
 *   cultures        - shared templates, seeded locally from the built-ins
 *   appSettings     - per-device preference, not shared state
 */
export const LOCAL_ONLY_TABLES = [
  "messages",
  "locationPings",
  "locationRequests",
  "cultures",
  "appSettings",
] as const;

/** Top-level fields holding Date values, per collection. */
export const DATE_FIELDS: Record<string, string[]> = {
  wedding: ["weddingDate", "createdAt", "updatedAt"],
  weddings: ["weddingDate", "createdAt", "updatedAt"],
  events: ["date", "createdAt", "updatedAt"],
  guests: ["rsvpDate", "createdAt", "updatedAt"],
  tasks: ["dueDate", "reminderDate", "completedAt", "createdAt", "updatedAt"],
  expenses: ["dueDate", "reconciledAt", "createdAt", "updatedAt"],
  budgetCategories: ["createdAt", "updatedAt"],
  vendors: ["contractDate", "serviceDate", "createdAt", "updatedAt"],
  messages: ["createdAt"],
  reminders: ["scheduledFor", "triggeredAt", "createdAt"],
  familyMembers: ["locationUpdatedAt", "createdAt", "updatedAt"],
  followUps: ["dueDate", "reminderDate", "completedAt", "createdAt", "updatedAt"],
  venues: ["createdAt", "updatedAt"],
  paymentPlans: ["startDate", "nextDueDate", "createdAt", "updatedAt"],
  cultures: ["createdAt", "updatedAt"],
};

/** Nested arrays of objects that carry their own date fields. */
export const NESTED_DATE_FIELDS: Record<string, Record<string, string[]>> = {
  events: { checklist: ["dueDate"], attachments: ["createdAt"] },
  tasks: {
    subtasks: ["completedAt"],
    comments: ["createdAt"],
    attachments: ["createdAt"],
  },
  expenses: { paymentSchedule: ["dueDate", "paidDate"], receipts: ["createdAt"] },
  paymentPlans: { installments: ["dueDate", "paidDate"] },
};

function toDate(value: unknown): unknown {
  if (value === null || value === undefined || value instanceof Date) return value;
  if (typeof value !== "string") return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed;
}

/** Revive every known date field on a record from the given collection. */
export function reviveDates<T>(collection: string, record: T): T {
  if (!record || typeof record !== "object") return record;
  const out: Record<string, unknown> = { ...(record as Record<string, unknown>) };

  for (const field of DATE_FIELDS[collection] ?? []) {
    if (field in out) out[field] = toDate(out[field]);
  }

  for (const [arrayField, fields] of Object.entries(NESTED_DATE_FIELDS[collection] ?? {})) {
    const arr = out[arrayField];
    if (Array.isArray(arr)) {
      out[arrayField] = arr.map((item) => {
        if (!item || typeof item !== "object") return item;
        const nested = { ...item };
        for (const field of fields) {
          if (field in nested) nested[field] = toDate(nested[field]);
        }
        return nested;
      });
    }
  }

  return out as T;
}

export function reviveAll(collection: string, records: unknown[] | undefined): unknown[] {
  return (records ?? []).map((r) => reviveDates(collection, r));
}

function isDateLike(value: unknown): boolean {
  // Not `instanceof Date`: values that have been through structuredClone can
  // come back carrying another realm's Date prototype, and instanceof then
  // reports false. The internal class survives.
  return Object.prototype.toString.call(value) === "[object Date]";
}

/**
 * Convert a record to plain JSON-safe values for transport, turning Dates into
 * ISO strings. `reviveDates` is the exact inverse.
 */
export function toPlain<T>(record: T): Record<string, unknown> {
  const walk = (value: unknown): unknown => {
    if (value === null || value === undefined) return value;
    if (isDateLike(value)) return new Date(value as Date).toISOString();
    // Array.from, not .map: values that came back out of IndexedDB can carry
    // another realm's Array prototype, and .map preserves it. Yjs checks
    // `instanceof Array`, which then fails with an opaque content-type error.
    if (Array.isArray(value)) return Array.from(value, walk);
    if (value instanceof Uint8Array) return Array.from(value);
    if (typeof value === "object") {
      // Likewise rebuilt locally rather than spread from the original.
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (v !== undefined) out[k] = walk(v);
      }
      return out;
    }
    if (typeof value === "function" || typeof value === "symbol") return undefined;
    return value;
  };

  return walk(record) as Record<string, unknown>;
}
