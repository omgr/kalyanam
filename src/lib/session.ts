/**
 * Active session helpers.
 *
 * The app identifies "you" by a user id kept in localStorage. Historically only
 * the onboarding flow wrote that key, so every other way of getting data onto a
 * device (file import, sync code, settings restore) left it unset — and each
 * write guarded on `!userId`, so tasks, reminders, messages and location
 * sharing silently did nothing. These helpers make the id recoverable from the
 * wedding data itself, so any entry point can establish a usable session.
 */

import { db } from "./db/schema";
import { generateId } from "./utils";

export const USER_ID_KEY = "kalyanam_user_id";
export const WEDDING_ID_KEY = "kalyanam_wedding_id";

/**
 * Which family member is holding *this* device.
 *
 * Distinct from the user id on purpose. The user id is recovered from the
 * wedding data so that writes never fail silently, which means every device
 * that joins a wedding ends up with the same one - fine for authorship, useless
 * for "who is where". Anything that answers a question about a person, rather
 * than about the data, has to use this instead.
 */
export const DEVICE_MEMBER_KEY = "kalyanam_member_id";

export function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_ID_KEY);
}

export function getStoredWeddingId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(WEDDING_ID_KEY);
}

/**
 * Return the current user id, deriving and persisting one if it is missing.
 *
 * Preference order: the id already stored, then the primary family member's
 * user id (so a restored backup keeps the same identity it had on the original
 * device), then the wedding's creator, and finally a freshly minted id.
 */
export async function resolveUserId(weddingId?: string | null): Promise<string> {
  const existing = getStoredUserId();
  if (existing) return existing;

  let userId: string | undefined;

  if (weddingId) {
    try {
      const members = await db.familyMembers
        .where("weddingId")
        .equals(weddingId)
        .toArray();
      userId =
        members.find((m) => m.role === "primary" && m.userId)?.userId ||
        members.find((m) => m.userId)?.userId;

      if (!userId) {
        userId = (await db.weddings.get(weddingId))?.createdBy;
      }
    } catch (error) {
      console.error("Could not derive user id from wedding data:", error);
    }
  }

  if (!userId) userId = generateId();

  localStorage.setItem(USER_ID_KEY, userId);
  return userId;
}

/**
 * Make `weddingId` the active wedding and guarantee a usable user id.
 * Every path that brings data onto this device should call this.
 */
export async function activateWedding(weddingId: string): Promise<string> {
  localStorage.setItem(WEDDING_ID_KEY, weddingId);
  return resolveUserId(weddingId);
}

/** The family member this device belongs to, if one has been chosen. */
export function getDeviceMemberId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DEVICE_MEMBER_KEY);
}

export function setDeviceMemberId(memberId: string): void {
  localStorage.setItem(DEVICE_MEMBER_KEY, memberId);
}

export function clearDeviceMemberId(): void {
  localStorage.removeItem(DEVICE_MEMBER_KEY);
}

/**
 * Resolve the family member record for this device, if the chosen one still
 * exists. Returns null when nobody has been picked yet - callers should ask
 * rather than guessing, because guessing means one person's phone reports
 * another person's location.
 */
export async function getDeviceMember(weddingId: string) {
  const memberId = getDeviceMemberId();
  if (!memberId) return null;
  const member = await db.familyMembers.get(memberId);
  return member && member.weddingId === weddingId ? member : null;
}

export function clearSession(): void {
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(WEDDING_ID_KEY);
  localStorage.removeItem(DEVICE_MEMBER_KEY);
}
