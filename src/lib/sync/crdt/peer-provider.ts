/**
 * A Yjs provider that syncs over PeerJS.
 *
 * Why not y-webrtc: its public signalling servers are all dead - the default
 * `wss://y-webrtc-eu.fly.dev` does not respond, and the yjs.dev servers are
 * gone. PeerJS runs a maintained free broker that answers in ~100ms, and the
 * library is already a dependency here.
 *
 * The broker only introduces peers. It never sees wedding data: once the
 * WebRTC connection is established the payload travels directly between
 * devices, encrypted by DTLS as all WebRTC traffic is.
 *
 * Topology: rather than electing a host, every device claims the lowest free
 * numbered slot in the room and dials all the others. The slot ids are
 * derivable only by someone who already knows the room secret, so the room is
 * both discoverable to family and opaque to everyone else. Losing any one
 * device does not break the mesh.
 */

import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import type Peer from "peerjs";
import type { DataConnection } from "peerjs";
import { deriveRoomId, slotPeerId, MAX_SLOTS } from "./room";

const MESSAGE_SYNC = 0;

export type SyncStatus =
  | "idle"
  | "connecting"
  | "waiting"      // in the room, nobody else here yet
  | "connected"    // at least one peer
  | "unsupported"  // no WebRTC in this browser
  | "error";

export interface PeerSyncOptions {
  onStatus?: (status: SyncStatus, peerCount: number) => void;
  onError?: (error: Error) => void;
  /** Override the broker; defaults to the PeerJS public cloud. */
  peerOptions?: Record<string, unknown>;
  /** How often to re-dial empty slots, to pick up devices that join later. */
  rediscoverMs?: number;
}

export interface PeerSyncHandle {
  status: () => SyncStatus;
  peerCount: () => number;
  destroy: () => void;
}

function encodeSyncStep1(doc: Y.Doc): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoder, doc);
  return encoding.toUint8Array(encoder);
}

function encodeUpdate(update: Uint8Array): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeUpdate(encoder, update);
  return encoding.toUint8Array(encoder);
}

export async function startPeerSync(
  doc: Y.Doc,
  weddingId: string,
  secret: string,
  options: PeerSyncOptions = {}
): Promise<PeerSyncHandle> {
  const { onStatus, onError, peerOptions, rediscoverMs = 20000 } = options;

  let status: SyncStatus = "connecting";
  let destroyed = false;
  let peer: Peer | null = null;
  let mySlot = -1;
  const connections = new Map<string, DataConnection>();
  let rediscoverTimer: ReturnType<typeof setInterval> | null = null;

  const setStatus = (next: SyncStatus) => {
    if (destroyed || status === next) return;
    status = next;
    onStatus?.(status, connections.size);
  };

  const refreshStatus = () => {
    if (destroyed) return;
    const next = connections.size > 0 ? "connected" : "waiting";
    if (status !== next) {
      status = next;
    }
    onStatus?.(status, connections.size);
  };

  if (typeof RTCPeerConnection === "undefined") {
    onStatus?.("unsupported", 0);
    return { status: () => "unsupported", peerCount: () => 0, destroy: () => {} };
  }

  const roomId = await deriveRoomId(weddingId, secret);

  // ------------------------------------------------------------------
  // wiring a single connection into the sync protocol
  // ------------------------------------------------------------------
  const wire = (conn: DataConnection) => {
    conn.on("open", () => {
      if (destroyed) return conn.close();
      connections.set(conn.peer, conn);
      // Ask what they have; they will reply with whatever we are missing.
      conn.send(encodeSyncStep1(doc));
      refreshStatus();
    });

    conn.on("data", (raw: unknown) => {
      if (destroyed) return;
      try {
        const bytes =
          raw instanceof Uint8Array
            ? raw
            : raw instanceof ArrayBuffer
              ? new Uint8Array(raw)
              : null;
        if (!bytes) return;

        const decoder = decoding.createDecoder(bytes);
        const messageType = decoding.readVarUint(decoder);
        if (messageType !== MESSAGE_SYNC) return;

        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        // `conn` as the origin stops the update we just applied from being
        // echoed straight back to the device that sent it.
        syncProtocol.readSyncMessage(decoder, encoder, doc, conn);

        if (encoding.length(encoder) > 1) {
          conn.send(encoding.toUint8Array(encoder));
        }
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    });

    const drop = () => {
      connections.delete(conn.peer);
      refreshStatus();
    };
    conn.on("close", drop);
    conn.on("error", drop);
  };

  // ------------------------------------------------------------------
  // local changes are broadcast to everyone connected
  // ------------------------------------------------------------------
  const onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (destroyed) return;
    const message = encodeUpdate(update);
    for (const conn of connections.values()) {
      // Do not send an update back to the peer it came from.
      if (conn === origin) continue;
      if (conn.open) conn.send(message);
    }
  };
  doc.on("update", onDocUpdate);

  // ------------------------------------------------------------------
  // claim a slot, then dial the others
  // ------------------------------------------------------------------
  const dialOthers = () => {
    if (destroyed || !peer) return;
    for (let slot = 0; slot < MAX_SLOTS; slot++) {
      if (slot === mySlot) continue;
      const id = slotPeerId(roomId, slot);
      if (connections.has(id)) continue;
      try {
        const conn = peer.connect(id, { reliable: true });
        // An empty slot simply errors; that is expected, not a failure.
        conn.on("error", () => {});
        wire(conn);
      } catch {
        /* empty slot */
      }
    }
  };

  const claimSlot = (slot: number): Promise<void> =>
    new Promise((resolve, reject) => {
      if (slot >= MAX_SLOTS) {
        reject(new Error("This wedding already has the maximum number of devices connected."));
        return;
      }

      // Imported lazily so the library never loads for people who do not sync.
      import("peerjs")
        .then(({ default: PeerCtor }) => {
          const candidate = new PeerCtor(slotPeerId(roomId, slot), {
            debug: 0,
            ...(peerOptions ?? {}),
          });

          const onOpen = () => {
            candidate.off("error", onErr);
            peer = candidate;
            mySlot = slot;
            candidate.on("connection", (conn) => wire(conn));
            resolve();
          };

          const onErr = (err: Error & { type?: string }) => {
            if (err.type === "unavailable-id") {
              // Someone else holds this slot - take the next one.
              candidate.destroy();
              claimSlot(slot + 1).then(resolve, reject);
            } else {
              reject(err);
            }
          };

          candidate.once("open", onOpen);
          candidate.on("error", onErr);
        })
        .catch(reject);
    });

  try {
    await claimSlot(0);
    if (destroyed) throw new Error("destroyed");

    dialOthers();
    refreshStatus();
    rediscoverTimer = setInterval(dialOthers, rediscoverMs);
  } catch (error) {
    setStatus("error");
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }

  return {
    status: () => status,
    peerCount: () => connections.size,
    destroy: () => {
      destroyed = true;
      if (rediscoverTimer) clearInterval(rediscoverTimer);
      doc.off("update", onDocUpdate);
      for (const conn of connections.values()) conn.close();
      connections.clear();
      peer?.destroy();
      peer = null;
    },
  };
}
