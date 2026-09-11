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
import { createWeddingDoc, type WeddingDoc, WEDDING_KEY } from "./doc";
import { startBridge, type BridgeHandle } from "./bridge";
import { startPeerSync, type PeerSyncHandle, type SyncStatus } from "./peer-provider";
import { getOrCreateRoomSecret, encodeInvite, type Invite } from "./room";

export * from "./room";
export type { SyncStatus } from "./peer-provider";

export interface FamilySyncHandle {
  weddingId: string;
  doc: Y.Doc;
  invite: () => string;
  status: () => SyncStatus;
  peerCount: () => number;
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
  /** Set false to run the CRDT locally with no network at all. */
  connect?: boolean;
  secret?: string;
}

export async function startFamilySync(
  weddingId: string,
  options: StartOptions = {}
): Promise<FamilySyncHandle> {
  if (active?.weddingId === weddingId) return active;
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
    await bridge.seedFromDexie();
  } else if (docHasWedding) {
    await bridge.applyToDexie();
  }

  const secret = options.secret ?? getOrCreateRoomSecret(weddingId);

  let peers: PeerSyncHandle | null = null;
  if (options.connect !== false) {
    peers = await startPeerSync(doc, weddingId, secret, {
      onStatus: options.onStatus,
      onError: options.onError,
    });
  }

  const handle = {
    weddingId,
    doc,
    invite: () => encodeInvite({ weddingId, secret } as Invite),
    status: () => peers?.status() ?? "idle",
    peerCount: () => peers?.peerCount() ?? 0,
    exportUpdate: () => Y.encodeStateAsUpdate(doc),
    mergeUpdate: async (update: Uint8Array) => {
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
