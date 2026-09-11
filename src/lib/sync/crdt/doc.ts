/**
 * The replicated document for one wedding.
 *
 * Every device holds a complete copy. Edits are applied locally and
 * immediately, online or not, and converge with everyone else's edits whenever
 * the devices next exchange updates - in any order, with no server deciding
 * who won.
 *
 * Shape: one Y.Map per collection, keyed by record id; each record is itself a
 * Y.Map of field -> value. Records are nested maps rather than plain objects so
 * merges happen per field. If you change an event's time while your mother
 * changes its venue, both survive; if the record were one opaque value, one
 * edit would silently overwrite the other.
 */

import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { SYNCED_TABLES, type SyncedTable } from "@/lib/db/records";

/** The wedding's own fields live in a map of their own. */
export const WEDDING_KEY = "wedding";

export interface WeddingDoc {
  weddingId: string;
  doc: Y.Doc;
  persistence: IndexeddbPersistence | null;
  /** Resolves once the on-disk copy has been loaded into the document. */
  whenLoaded: Promise<void>;
  destroy: () => void;
}

export function collection(doc: Y.Doc, table: SyncedTable | typeof WEDDING_KEY) {
  return doc.getMap<Y.Map<unknown>>(table);
}

/** Every collection map, including the single-record wedding map. */
export function allCollections(doc: Y.Doc) {
  return [WEDDING_KEY, ...SYNCED_TABLES].map(
    (name) => [name, collection(doc, name as SyncedTable)] as const
  );
}

/** IndexedDB database name holding the replicated document for a wedding. */
export function docStoreName(weddingId: string): string {
  return `kalyanam-doc-${weddingId}`;
}

/**
 * Create the document for a wedding and, in the browser, attach local
 * persistence so it survives a reload and is usable fully offline.
 */
export function createWeddingDoc(
  weddingId: string,
  options: { persist?: boolean } = {}
): WeddingDoc {
  const doc = new Y.Doc({ guid: `kalyanam-${weddingId}` });

  const shouldPersist = options.persist ?? typeof indexedDB !== "undefined";
  let persistence: IndexeddbPersistence | null = null;
  let whenLoaded: Promise<void> = Promise.resolve();

  if (shouldPersist) {
    persistence = new IndexeddbPersistence(docStoreName(weddingId), doc);
    whenLoaded = persistence.whenSynced.then(() => undefined);
  }

  return {
    weddingId,
    doc,
    persistence,
    whenLoaded,
    destroy: () => {
      persistence?.destroy();
      doc.destroy();
    },
  };
}

/**
 * Read one record out of the document as a plain object, or undefined when it
 * is not there.
 */
export function readRecord(
  doc: Y.Doc,
  table: string,
  id: string
): Record<string, unknown> | undefined {
  const entry = doc.getMap<Y.Map<unknown>>(table).get(id);
  return entry ? (entry.toJSON() as Record<string, unknown>) : undefined;
}

/**
 * Read every record in a collection as plain objects.
 *
 * The record id is the map key rather than a stored field, so it is merged
 * back in here - without it the results cannot be written to Dexie, whose
 * primary key is `id`.
 */
export function readCollection(doc: Y.Doc, table: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  doc.getMap<Y.Map<unknown>>(table).forEach((entry, id) => {
    if (entry) out.push({ ...(entry.toJSON() as Record<string, unknown>), id });
  });
  return out;
}

/**
 * Write a record's fields into the document, creating it if needed.
 *
 * Only changed fields are touched, so an untouched field never generates an
 * update and never competes with a concurrent edit elsewhere.
 */
export function writeRecord(
  doc: Y.Doc,
  table: string,
  id: string,
  fields: Record<string, unknown>
): void {
  const col = doc.getMap<Y.Map<unknown>>(table);
  let entry = col.get(id);

  if (!entry) {
    entry = new Y.Map<unknown>();
    col.set(id, entry);
  }

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) {
      if (entry.has(key)) entry.delete(key);
      continue;
    }
    // Comparing before writing keeps no-op saves from producing updates.
    const current = entry.get(key);
    if (JSON.stringify(current) !== JSON.stringify(value)) {
      try {
        entry.set(key, value);
      } catch (error) {
        // Yjs only reports "Unexpected content type", which says nothing about
        // where the bad value came from.
        throw new Error(
          `Cannot replicate ${table}.${id}.${key}: unsupported value of type ` +
            `${Object.prototype.toString.call(value)}`,
          { cause: error }
        );
      }
    }
  }
}

/**
 * Remove a record. Deleting a key from a Y.Map is itself a replicated
 * operation, so this propagates without needing manual tombstones.
 */
export function deleteRecord(doc: Y.Doc, table: string, id: string): void {
  doc.getMap<Y.Map<unknown>>(table).delete(id);
}
