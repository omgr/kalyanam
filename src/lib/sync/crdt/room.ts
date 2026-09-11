/**
 * Deriving the peer-to-peer room a wedding syncs in.
 *
 * Knowing the room id is what grants access, so it must not be guessable from
 * anything public. It is derived from the wedding id plus a secret generated
 * once per wedding and shared out of band - by QR, or by pasting the invite
 * into the family's group chat.
 *
 * The old six-character code could not be made secure without a server to
 * exchange it through: six characters is roughly 30 bits, and the broker would
 * happily let anyone enumerate them. The invite below is long because it is
 * the whole secret, and it is meant to be scanned or pasted rather than typed.
 */

import { generateId } from "@/lib/utils";

export const ROOM_SECRET_KEY = "kalyanam_room_secret";

/** PeerJS ids must be short and alphanumeric. */
const ID_PREFIX = "kal";

/** How many devices can be in a room at once. */
export const MAX_SLOTS = 8;

export interface Invite {
  weddingId: string;
  secret: string;
}

function secretStorageKey(weddingId: string) {
  return `${ROOM_SECRET_KEY}_${weddingId}`;
}

/** The room secret for this wedding, generated and stored on first use. */
export function getOrCreateRoomSecret(weddingId: string): string {
  const key = secretStorageKey(weddingId);
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const secret = generateId().replace(/-/g, "");
  localStorage.setItem(key, secret);
  return secret;
}

/** Adopt a secret received from another device. */
export function storeRoomSecret(weddingId: string, secret: string): void {
  localStorage.setItem(secretStorageKey(weddingId), secret);
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * The room fingerprint. Both halves are needed to produce it, so the wedding
 * id alone - which travels in exported backups - does not reveal the room.
 */
export async function deriveRoomId(weddingId: string, secret: string): Promise<string> {
  const hash = await sha256Hex(`kalyanam:${weddingId}:${secret}`);
  return hash.slice(0, 24);
}

/** The PeerJS id for one slot in a room. */
export function slotPeerId(roomId: string, slot: number): string {
  return `${ID_PREFIX}-${roomId}-${slot}`;
}

/** Encode an invite for a QR code or a pasted link. */
export function encodeInvite(invite: Invite): string {
  const json = JSON.stringify([invite.weddingId, invite.secret]);
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeInvite(code: string): Invite | null {
  try {
    const normalised = code.trim().replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalised + "=".repeat((4 - (normalised.length % 4)) % 4);
    const [weddingId, secret] = JSON.parse(atob(padded));
    if (typeof weddingId !== "string" || typeof secret !== "string") return null;
    return { weddingId, secret };
  } catch {
    return null;
  }
}
