/**
 * Two-way projection between Dexie and the replicated document.
 *
 * The entire UI - every hook, query and screen - keeps reading and writing
 * Dexie exactly as before. This bridge mirrors local Dexie writes into the CRDT
 * and applies incoming CRDT changes back into Dexie, so nothing above this
 * layer has to know that sync exists.
 *
 * The hazard to watch is an echo: applying a remote change writes to Dexie,
 * whose hooks would mirror it straight back into the document. A re-entrancy
 * flag plus an origin marker on our own transactions keeps the two directions
 * from chasing each other.
 */

import * as Y from "yjs";
import type { Table } from "dexie";
import { db } from "@/lib/db/schema";
import { SYNCED_TABLES, reviveDates, toPlain } from "@/lib/db/records";
import { WEDDING_KEY, readCollection, writeRecord, deleteRecord } from "./doc";

/** Marks transactions this bridge produced, so we ignore our own echoes. */
export const LOCAL_ORIGIN = Symbol("kalyanam-local");

/**
 * Suppresses replication for writes made inside `runLocalOnly`.
 *
 * Module-level rather than per-bridge because the caller - "remove this
 * wedding from this phone" - should not have to know whether a bridge is
 * running, or find it.
 */
let localOnlyDepth = 0;

/**
 * Run writes that must NOT reach the rest of the family.
 *
 * Removing a wedding from your own device is the case this exists for.
 * Deleting a record is a legitimate replicated operation - one person striking
 * a task off should clear it everywhere - but "I am done with this on this
 * phone" is not the same statement as "destroy the family's copy". Without
 * this, one person logging out wiped the wedding from every connected device
 * and left the others with nothing.
 */
export async function runLocalOnly<T>(work: () => Promise<T>): Promise<T> {
  localOnlyDepth++;
  try {
    return await work();
  } finally {
    localOnlyDepth--;
  }
}

export function isLocalOnly(): boolean {
  return localOnlyDepth > 0;
}

type Row = Record<string, unknown>;

export interface BridgeHandle {
  stop: () => void;
  /** Copy everything currently in Dexie into the document. */
  seedFromDexie: () => Promise<void>;
  /** Copy everything currently in the document into Dexie. */
  applyToDexie: () => Promise<void>;
}

/** Document collection name -> Dexie table name. */
const dexieNameFor = (docName: string) =>
  docName === WEDDING_KEY ? "weddings" : docName;

function tableOf(name: string): Table<Row, string> | undefined {
  return (db as unknown as Record<string, Table<Row, string>>)[name];
}

export function startBridge(doc: Y.Doc, weddingId: string): BridgeHandle {
  /** True while we are writing Dexie on behalf of a remote change. */
  let applyingRemote = false;
  const teardown: Array<() => void> = [];

  // ---------------------------------------------------------------
  // Dexie -> document
  // ---------------------------------------------------------------
  const mirrorUpsert = (docName: string, record: Row) => {
    if (localOnlyDepth > 0 || applyingRemote || !record?.id) return;
    // Only replicate rows belonging to the wedding we are syncing.
    if (docName === WEDDING_KEY) {
      if (record.id !== weddingId) return;
    } else if (record.weddingId !== weddingId) {
      return;
    }
    doc.transact(
      () => writeRecord(doc, docName, String(record.id), toPlain(record)),
      LOCAL_ORIGIN
    );
  };

  const mirrorDelete = (docName: string, id: string) => {
    if (localOnlyDepth > 0 || applyingRemote) return;
    doc.transact(() => deleteRecord(doc, docName, id), LOCAL_ORIGIN);
  };

  const hookTable = (dexieName: string, docName: string) => {
    const table = tableOf(dexieName);
    if (!table) return;
    // Dexie's hook overloads are not expressible together in TS.
    const hook = (table as unknown as {
      hook: (name: string, fn?: unknown) => { unsubscribe: (fn: unknown) => void };
    }).hook;

    // The guard is evaluated synchronously, inside the hook, because that is
    // the only moment `applyingRemote` is reliably true. Deferring the check
    // to the microtask would let a remote change slip back out as a local one.
    const creating = (_pk: unknown, obj: Row) => {
      if (localOnlyDepth > 0 || applyingRemote) return;
      const snapshot = { ...obj };
      queueMicrotask(() => mirrorUpsert(docName, snapshot));
    };
    const updating = (mods: Row, _pk: unknown, obj: Row) => {
      if (localOnlyDepth > 0 || applyingRemote) return;
      const snapshot = { ...obj, ...mods };
      queueMicrotask(() => mirrorUpsert(docName, snapshot));
    };
    const deleting = (pk: unknown) => {
      if (localOnlyDepth > 0 || applyingRemote) return;
      const id = String(pk);
      queueMicrotask(() => mirrorDelete(docName, id));
    };

    hook.call(table, "creating", creating);
    hook.call(table, "updating", updating);
    hook.call(table, "deleting", deleting);

    teardown.push(() => {
      hook.call(table, "creating").unsubscribe(creating);
      hook.call(table, "updating").unsubscribe(updating);
      hook.call(table, "deleting").unsubscribe(deleting);
    });
  };

  hookTable("weddings", WEDDING_KEY);
  for (const name of SYNCED_TABLES) hookTable(name, name);

  // ---------------------------------------------------------------
  // document -> Dexie
  // ---------------------------------------------------------------
  const applyRecord = async (docName: string, id: string) => {
    const table = tableOf(dexieNameFor(docName));
    if (!table) return;

    const entry = doc.getMap<Y.Map<unknown>>(docName).get(id);
    if (!entry) {
      await table.delete(id);
      return;
    }

    const plain = entry.toJSON() as Row;
    plain.id = id;
    if (docName !== WEDDING_KEY) plain.weddingId = weddingId;

    await table.put(reviveDates(dexieNameFor(docName), plain));
  };

  const applyChanges = async (
    docName: string,
    touched: Set<string>,
    removed: Set<string>
  ) => {
    applyingRemote = true;
    try {
      const table = tableOf(dexieNameFor(docName));
      if (!table) return;
      for (const id of removed) await table.delete(id);
      for (const id of touched) await applyRecord(docName, id);
    } finally {
      applyingRemote = false;
    }
  };

  // One observer per collection, so the collection name is captured in the
  // closure rather than reconstructed from the event path.
  for (const docName of [WEDDING_KEY, ...SYNCED_TABLES]) {
    const map = doc.getMap<Y.Map<unknown>>(docName);

    const observer = (events: Y.YEvent<never>[], transaction: Y.Transaction) => {
      if (transaction.origin === LOCAL_ORIGIN) return; // our own write

      const touched = new Set<string>();
      const removed = new Set<string>();

      for (const event of events) {
        if (event.path.length === 0) {
          // Records added to or deleted from the collection.
          const keys = (event as unknown as Y.YMapEvent<unknown>).changes.keys;
          keys.forEach((change, key) => {
            if (change.action === "delete") removed.add(key);
            else touched.add(key);
          });
        } else {
          // Fields changed inside one record.
          touched.add(String(event.path[0]));
        }
      }

      void applyChanges(docName, touched, removed);
    };

    map.observeDeep(observer as Parameters<typeof map.observeDeep>[0]);
    teardown.push(() =>
      map.unobserveDeep(observer as Parameters<typeof map.observeDeep>[0])
    );
  }

  // ---------------------------------------------------------------
  // bulk directions, used for migration and for a first join
  // ---------------------------------------------------------------
  const seedFromDexie = async () => {
    const wedding = await db.weddings.get(weddingId);
    if (wedding) {
      doc.transact(
        () => writeRecord(doc, WEDDING_KEY, weddingId, toPlain(wedding)),
        LOCAL_ORIGIN
      );
    }

    for (const name of SYNCED_TABLES) {
      const table = tableOf(name);
      if (!table) continue;
      const rows = await table.where("weddingId").equals(weddingId).toArray();
      if (!rows.length) continue;
      doc.transact(() => {
        for (const row of rows) writeRecord(doc, name, String(row.id), toPlain(row));
      }, LOCAL_ORIGIN);
    }
  };

  const applyToDexie = async () => {
    applyingRemote = true;
    try {
      const wedding = readCollection(doc, WEDDING_KEY)[0];
      if (wedding) {
        await db.weddings.put(
          reviveDates("weddings", { ...wedding, id: weddingId }) as never
        );
      }
      for (const name of SYNCED_TABLES) {
        const table = tableOf(name);
        if (!table) continue;
        const rows = readCollection(doc, name).map((r) =>
          reviveDates(name, { ...r, weddingId })
        );
        if (rows.length) await table.bulkPut(rows);
      }
    } finally {
      applyingRemote = false;
    }
  };

  return {
    stop: () => teardown.forEach((fn) => fn()),
    seedFromDexie,
    applyToDexie,
  };
}
