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
import { logInfo, logWarn, logError } from "@/lib/diagnostics/logger";

const MESSAGE_SYNC = 0;

/**
 * How devices find a route to each other.
 *
 * STUN alone is not enough. It tells each device its own public address so the
 * two can try to punch a hole directly, which works on most home wifi - but
 * Indian mobile networks put subscribers behind carrier-grade NAT, where that
 * hole punch usually fails. Two phones on mobile data are exactly the case STUN
 * cannot solve.
 *
 * A TURN server fixes it by relaying the traffic when a direct path cannot be
 * found. It still cannot read anything: WebRTC payloads are encrypted
 * end-to-end by DTLS, so a relay operator sees ciphertext. The free Open Relay
 * project is used here as a best-effort fallback; if it is unavailable the ICE
 * candidate is simply skipped, and the merge file remains the route that always
 * works.
 */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turn:openrelay.metered.ca:443?transport=tcp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

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
  /** Called when we can explain a failure in plain language. */
  onDiagnosis?: (message: string) => void;
  /** Override the broker; defaults to the PeerJS public cloud. */
  peerOptions?: Record<string, unknown>;
  /** How often to re-dial empty slots, to pick up devices that join later. */
  rediscoverMs?: number;
  /** Give up waiting for the broker after this long. */
  connectTimeoutMs?: number;
}

export interface PeerSyncHandle {
  status: () => SyncStatus;
  peerCount: () => number;
  /** Why the last failure happened, in words a family can act on. */
  diagnosis: () => string | null;
  /** Retry from scratch: reclaim a slot and re-dial. */
  retry: () => Promise<void>;
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
  const {
    onStatus, onError, onDiagnosis, peerOptions,
    rediscoverMs = 20000, connectTimeoutMs = 25000,
  } = options;

  let status: SyncStatus = "connecting";
  let destroyed = false;
  let peer: Peer | null = null;
  let mySlot = -1;
  let diagnosis: string | null = null;
  let reconnectAttempts = 0;
  let lastLoggedErrorType: string | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const diagnose = (message: string) => {
    // Repeating the same explanation on every retry fills the log and hides
    // whatever else happened.
    if (diagnosis !== message) {
      void logWarn("sync", "diagnosis", { text: message });
    }
    diagnosis = message;
    onDiagnosis?.(message);
  };
  const connections = new Map<string, DataConnection>();
  let rediscoverTimer: ReturnType<typeof setTimeout> | null = null;

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
    return {
      status: () => "unsupported",
      peerCount: () => 0,
      diagnosis: () =>
        "This browser cannot make direct connections between devices. Use a merge file, " +
        "or try Chrome or Safari.",
      retry: async () => {},
      destroy: () => {},
    };
  }

  const roomId = await deriveRoomId(weddingId, secret);
  // The room id is a hash and carries no wedding content, so the first 6
  // characters are safe to log and let two devices' logs be matched up.
  const roomTag = roomId.slice(0, 6);
  void logInfo("sync", "starting peer sync", { room: roomTag, online: navigator.onLine });

  // ------------------------------------------------------------------
  // wiring a single connection into the sync protocol
  // ------------------------------------------------------------------
  const wire = (conn: DataConnection) => {
    conn.on("open", () => {
      if (destroyed) return conn.close();
      // Belt and braces against ever peering with ourselves.
      if (peer && conn.peer === peer.id) {
        void logWarn("sync", "ignoring a connection to ourselves");
        conn.close();
        return;
      }
      lastLoggedErrorType = null;
      void logInfo("sync", "peer connected", { slot: conn.peer.split("-").pop(), total: connections.size + 1 });
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
      if (connections.has(conn.peer)) {
        void logInfo("sync", "peer disconnected", { slot: conn.peer.split("-").pop() });
      }
      connections.delete(conn.peer);
      refreshStatus();
      // Losing the last peer is normal (they closed the app), not an error.
      if (connections.size === 0) diagnosis = null;
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
  let attemptedDials = 0;
  let discoveryRound = 0;

  /**
   * Dial the other slots, looking for family.
   *
   * This used to fire at every slot every twenty seconds, forever: seven
   * connection attempts a minute, per device, against a free shared broker.
   * That is enough to be throttled, and being throttled looks exactly like the
   * broker "not responding" - which is what a real phone reported.
   *
   * Now it backs off once nobody is found, and stops entirely while a peer is
   * connected, since a connected device has nothing to discover.
   */
  const dialOthers = () => {
    if (destroyed || !peer) return;
    if (connections.size > 0) return; // already have family; leave the broker alone

    discoveryRound++;
    for (let slot = 0; slot < MAX_SLOTS; slot++) {
      if (slot === mySlot) continue;
      const id = slotPeerId(roomId, slot);
      if (connections.has(id)) continue;
      try {
        const conn = peer.connect(id, { reliable: true });
        // An empty slot simply errors; that is expected, not a failure.
        conn.on("error", () => {});
        wire(conn);

        // A peer that answers but never opens is the signature of a network
        // that permits signalling and blocks the media path.
        setTimeout(() => {
          if (!destroyed && !conn.open && connections.size === 0) {
            attemptedDials++;
            if (attemptedDials >= MAX_SLOTS - 1 && !diagnosis && connections.size === 0) {
              diagnose(
                "Found the family but could not open a direct connection. This network is " +
                  "probably blocking device-to-device traffic - try mobile data, or send a " +
                  "merge file instead."
              );
            }
          }
        }, 12000);
      } catch {
        /* empty slot */
      }
    }
  };

  /**
   * Re-establish the broker socket after a drop.
   *
   * `peer.reconnect()` reuses the same id, so the slot is kept and family
   * already connected are unaffected - existing data channels survive a broker
   * outage, since the broker is only ever an introducer.
   */
  const scheduleReconnect = () => {
    if (destroyed || reconnectTimer) return;

    const delay = Math.min(2000 * 2 ** Math.min(reconnectAttempts, 5), 60_000);
    reconnectAttempts++;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (destroyed || !peer) return;

      if (peer.destroyed) {
        void logWarn("sync", "peer was destroyed; starting over");
        void retry();
        return;
      }

      if (peer.disconnected) {
        try {
          peer.reconnect();
          void logInfo("sync", "reconnecting to the broker", { attempt: reconnectAttempts });
        } catch {
          void retry();
        }
        // If it is still down next time round, try again, more slowly.
        setTimeout(() => {
          if (!destroyed && peer?.disconnected) scheduleReconnect();
        }, 5000);
      }
    }, delay);
  };

  /**
   * Look again, less and less often. A family member opening the app later is
   * worth waiting for; hammering a shared broker while nobody is there is not.
   */
  const scheduleRediscovery = () => {
    if (destroyed) return;
    const backoff = Math.min(rediscoverMs * 2 ** Math.min(discoveryRound, 4), 5 * 60_000);
    rediscoverTimer = setTimeout(() => {
      dialOthers();
      scheduleRediscovery();
    }, backoff);
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
            config: { iceServers: ICE_SERVERS },
            ...(peerOptions ?? {}),
          });

          let timer: ReturnType<typeof setTimeout>;

          const onOpen = () => {
            void logInfo("sync", "claimed a slot with the broker", { slot, room: roomTag });
            candidate.off("error", onErr);
            peer = candidate;
            mySlot = slot;
            reconnectAttempts = 0;
            candidate.on("connection", (conn) => wire(conn));

            /**
             * The socket to the broker drops, and on a mobile network it drops
             * often - a real phone's log showed four drops in twenty minutes.
             * Nothing here used to re-establish it, so after the first drop the
             * device stayed invisible to anyone trying to reach it while
             * looking, from the outside, exactly like it was still waiting.
             */
            candidate.on("disconnected", () => {
              if (destroyed) return;
              void logWarn("sync", "broker socket dropped", { attempt: reconnectAttempts + 1 });
              scheduleReconnect();
            });

            resolve();
          };

          const onErr = (err: Error & { type?: string }) => {
            // An empty slot reports peer-unavailable. That is the normal case
            // while looking for family - not a failure, and not something to
            // tell anyone about. It used to fall through to the catch-all
            // below and announce "could not connect to the family" about a
            // tenth of a second after a perfectly successful start.
            if (err.type === "peer-unavailable") return;

            // PeerJS emits "disconnected" repeatedly - seven times in a burst
            // in one real log - and each one says the same thing.
            if (err.type !== lastLoggedErrorType) {
              void logWarn("sync", "broker error", { type: err.type ?? "unknown", slot });
              lastLoggedErrorType = err.type ?? "unknown";
            }

            if (err.type === "unavailable-id") {
              // Someone else holds this slot - take the next one. The timer
              // for THIS attempt has to go with it, or it fires later and
              // reports a timeout against a slot we already stopped waiting
              // on, long after another slot connected fine.
              clearTimeout(timer);
              candidate.destroy();
              claimSlot(slot + 1).then(resolve, reject);
              return;
            }

            // PeerJS error types map onto causes a family can actually act on.
            switch (err.type) {
              case "network":
              case "server-error":
              case "socket-error":
              case "socket-closed":
                // Recoverable: try to get the socket back rather than sitting
                // there explaining that it is gone.
                scheduleReconnect();
                diagnose(
                  "Could not reach the matchmaking service. Check this device is online, " +
                    "then try again. If it keeps failing, use a merge file instead."
                );
                break;
              case "browser-incompatible":
                diagnose(
                  "This browser cannot make a direct connection. Try Chrome or Safari, " +
                    "or use a merge file."
                );
                break;
              case "ssl-unavailable":
                diagnose("A secure connection could not be established on this network.");
                break;
              default:
                diagnose(
                  "Could not connect to the family. Some public and office networks block " +
                    "direct device-to-device connections - mobile data usually works, and a " +
                    "merge file always does."
                );
            }
            reject(err);
          };

          // Nothing here is allowed to hang indefinitely. A broker that
          // accepts the socket and never answers used to leave the UI
          // spinning with no explanation at all.
          timer = setTimeout(() => {
            candidate.off("open", onOpen);
            candidate.off("error", onErr);
            candidate.destroy();
            void logError("sync", "broker did not respond", {
              slot, timeoutMs: connectTimeoutMs, online: navigator.onLine, room: roomTag,
            });
            diagnose(
              "The matchmaking service did not respond. Check this device is online and try " +
                "again - if it keeps happening, send a merge file instead."
            );
            reject(new Error("Timed out reaching the matchmaking service"));
          }, connectTimeoutMs);

          candidate.once("open", () => {
            clearTimeout(timer);
            onOpen();
          });
          candidate.on("error", (err: Error & { type?: string }) => {
            // onErr clears the timer itself where it needs to survive a hop.
            if (err.type !== "unavailable-id" && err.type !== "peer-unavailable") {
              clearTimeout(timer);
            }
            onErr(err);
          });
        })
        .catch(reject);
    });

  try {
    await claimSlot(0);
    if (destroyed) throw new Error("destroyed");

    dialOthers();
    refreshStatus();
    scheduleRediscovery();
  } catch (error) {
    setStatus("error");
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }

  // Declared as a function so the reconnect scheduler above can call it
  // regardless of ordering, rather than relying on its timer being slow enough.
  async function retry() {
    if (destroyed) return;
    diagnosis = null;
    attemptedDials = 0;
    discoveryRound = 0;
    if (rediscoverTimer) clearTimeout(rediscoverTimer);
    for (const conn of connections.values()) conn.close();
    connections.clear();
    peer?.destroy();
    peer = null;
    mySlot = -1;
    setStatus("connecting");
    try {
      await claimSlot(0);
      dialOthers();
      refreshStatus();
      scheduleRediscovery();
    } catch (error) {
      setStatus("error");
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  return {
    status: () => status,
    peerCount: () => connections.size,
    diagnosis: () => diagnosis,
    retry,
    destroy: () => {
      destroyed = true;
      if (rediscoverTimer) clearTimeout(rediscoverTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      doc.off("update", onDocUpdate);
      for (const conn of connections.values()) conn.close();
      connections.clear();
      peer?.destroy();
      peer = null;
    },
  };
}
