/**
 * Family sync: one wedding, replicated across the family's devices.
 *
 * Assembled from four pieces:
 *   doc.ts           the replicated document (CRDT)
 *   bridge.ts        two-way projection to and from Dexie
 *   peer-provider.ts transport over PeerJS
 *   room.ts          how devices find each other without leaking the room
 *
 * Because the document is a CRDT, every transport is a valid one. A live
 * peer-to-peer connection is the convenient case, but a merge file sent
 * through the family's group chat produces exactly the same result - merging
 * is order-independent and idempotent, so it does not matter how or in what
 * order the bytes arrive. That is what makes a no-backend design workable
 * rather than merely a nice idea.
 */

import * as Y from "yjs";
import { db } from "@/lib/db/schema";
import { createWeddingDoc, docStoreName, type WeddingDoc, WEDDING_KEY } from "./doc";
import { startBridge, LOCAL_ORIGIN, runLocalOnly, type BridgeHandle } from "./bridge";
import { startPeerSync, type PeerSyncHandle, type SyncStatus } from "./peer-provider";
import { getOrCreateRoomSecret, encodeInvite, type Invite } from "./room";
import { logInfo, logError } from "@/lib/diagnostics/logger";

export * from "./room";
export { runLocalOnly } from "./bridge";
export type { SyncStatus } from "./peer-provider";

export interface FamilySyncHandle {
  weddingId: string;
  doc: Y.Doc;
  invite: () => string;
  status: () => SyncStatus;
  peerCount: () => number;
  /** Plain-language explanation of the last failure, if there was one. */
  diagnosis: () => string | null;
  /** When this device last exchanged anything with a peer. */
  lastSyncedAt: () => Date | null;
  /** Reconnect from scratch. */
  retry: () => Promise<void>;
  /** Bytes representing everything this device knows, for file-based merge. */
  exportUpdate: () => Uint8Array;
  /** Merge bytes from another device. Safe to apply repeatedly. */
  mergeUpdate: (update: Uint8Array) => Promise<void>;
  stop: () => void;
}

let active: (FamilySyncHandle & { _internal: { weddingDoc: WeddingDoc; bridge: BridgeHandle; peers: PeerSyncHandle | null } }) | null = null;

export function getActiveSync(): FamilySyncHandle | null {
  return active;
}

export interface StartOptions {
  onStatus?: (status: SyncStatus, peerCount: number) => void;
  onError?: (error: Error) => void;
  onDiagnosis?: (message: string) => void;
  /** Fires whenever a remote update lands, so the UI can show freshness. */
  onSynced?: (at: Date) => void;
  /** Set false to run the CRDT locally with no network at all. */
  connect?: boolean;
  secret?: string;
}

/**
 * In-flight start, so concurrent callers share one session.
 *
 * Both the sync panel and the sidebar indicator ask for sync, and neither
 * knows about the other. Checking `active` was not enough: both got past the
 * check before either had finished starting, so one phone opened two sessions,
 * claimed two slots in its own room and connected to itself. A real device's
 * log shows it plainly - two "starting peer sync" entries two milliseconds
 * apart, then slots 0 and 1 both taken by the same handset.
 */
let starting: { weddingId: string; promise: Promise<FamilySyncHandle> } | null = null;

export function startFamilySync(
  weddingId: string,
  options: StartOptions = {}
): Promise<FamilySyncHandle> {
  if (active?.weddingId === weddingId) return Promise.resolve(active);
  if (starting?.weddingId === weddingId) return starting.promise;

  const promise = beginFamilySync(weddingId, options).finally(() => {
    if (starting?.promise === promise) starting = null;
  });

  starting = { weddingId, promise };
  return promise;
}

async function beginFamilySync(
  weddingId: string,
  options: StartOptions = {}
): Promise<FamilySyncHandle> {
  if (active) active.stop();

  const weddingDoc = createWeddingDoc(weddingId);
  await weddingDoc.whenLoaded;

  const { doc } = weddingDoc;
  const bridge = startBridge(doc, weddingId);

  // Reconcile whichever side has data. On an existing device the document is
  // empty on first run and Dexie holds everything; on a device that just
  // joined, the reverse is true.
  const docHasWedding = doc.getMap(WEDDING_KEY).size > 0;
  const localWedding = await db.weddings.get(weddingId);

  if (!docHasWedding && localWedding) {
    void logInfo("sync", "seeding the replicated document from local data");
    await bridge.seedFromDexie();
  } else if (docHasWedding) {
    void logInfo("sync", "applying the replicated document to local data");
    await bridge.applyToDexie();
  }

  // Anything arriving from a peer counts as a successful exchange. Freshness
  // is what tells a family whether they are looking at current information.
  let lastSyncedAt: Date | null = null;
  doc.on("update", (_update: Uint8Array, origin: unknown) => {
    if (origin === LOCAL_ORIGIN || origin === null || origin === undefined) return;
    lastSyncedAt = new Date();
    options.onSynced?.(lastSyncedAt);
  });

  const secret = options.secret ?? getOrCreateRoomSecret(weddingId);

  let peers: PeerSyncHandle | null = null;
  if (options.connect !== false) {
    peers = await startPeerSync(doc, weddingId, secret, {
      onStatus: options.onStatus,
      onError: options.onError,
      onDiagnosis: options.onDiagnosis,
    });
  }

  const handle = {
    weddingId,
    doc,
    invite: () => encodeInvite({ weddingId, secret } as Invite),
    status: () => peers?.status() ?? "idle",
    peerCount: () => peers?.peerCount() ?? 0,
    diagnosis: () => peers?.diagnosis() ?? null,
    lastSyncedAt: () => lastSyncedAt,
    retry: async () => {
      await peers?.retry();
    },
    exportUpdate: () => Y.encodeStateAsUpdate(doc),
    mergeUpdate: async (update: Uint8Array) => {
      void logInfo("sync", "merging an update file", { bytes: update.byteLength });
      Y.applyUpdate(doc, update, "merge-file");
      // The bridge observer applies most of this, but a bulk merge is worth
      // reconciling wholesale so nothing is missed.
      await bridge.applyToDexie();
    },
    stop: () => {
      peers?.destroy();
      bridge.stop();
      weddingDoc.destroy();
      if (active?.weddingId === weddingId) active = null;
    },
    _internal: { weddingDoc, bridge, peers },
  };

  active = handle;
  return handle;
}

/** Copy into a fresh ArrayBuffer so the Blob type is unambiguous. */
function toBlob(bytes: Uint8Array): Blob {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return new Blob([copy.buffer as ArrayBuffer], { type: "application/octet-stream" });
}

/**
 * Produce a merge file for a wedding without needing a live session.
 * Unlike the JSON backup, applying this never overwrites - it merges.
 */
export async function createMergeFile(weddingId: string): Promise<Blob> {
  const existing = getActiveSync();
  if (existing?.weddingId === weddingId) {
    return toBlob(existing.exportUpdate());
  }

  const weddingDoc = createWeddingDoc(weddingId);
  await weddingDoc.whenLoaded;
  const bridge = startBridge(weddingDoc.doc, weddingId);
  await bridge.seedFromDexie();
  const bytes = Y.encodeStateAsUpdate(weddingDoc.doc);
  bridge.stop();
  weddingDoc.destroy();
  return toBlob(bytes);
}

/**
 * Remove every trace of sync from this device.
 *
 * The replicated document lives in its own IndexedDB database, separate from
 * the wedding data, so wiping the wedding without this leaves the document
 * behind - and the next time sync starts it faithfully restores everything the
 * person just asked to delete.
 */
export async function forgetSyncData(weddingId?: string): Promise<void> {
  active?.stop();
  active = null;

  const names: string[] = [];
  try {
    const databases = await indexedDB.databases?.();
    for (const database of databases ?? []) {
      if (database.name?.startsWith("kalyanam-doc-")) names.push(database.name);
    }
  } catch {
    /* indexedDB.databases is not available everywhere */
  }

  // Fall back to the one we know the name of.
  if (names.length === 0 && weddingId) names.push(docStoreName(weddingId));

  await Promise.all(
    names.map(
      (name) =>
        new Promise<void>((resolve) => {
          const request = indexedDB.deleteDatabase(name);
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
          request.onblocked = () => resolve();
        })
    )
  );
}

/** Apply a merge file produced by another device. */
export async function applyMergeFile(
  weddingId: string,
  bytes: Uint8Array
): Promise<void> {
  const existing = getActiveSync();
  if (existing?.weddingId === weddingId) {
    await existing.mergeUpdate(bytes);
    return;
  }

  const weddingDoc = createWeddingDoc(weddingId);
  await weddingDoc.whenLoaded;
  const bridge = startBridge(weddingDoc.doc, weddingId);
  await bridge.seedFromDexie();
  Y.applyUpdate(weddingDoc.doc, bytes, "merge-file");
  await bridge.applyToDexie();
  bridge.stop();
  weddingDoc.destroy();
}
