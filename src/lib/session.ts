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

export function clearSession(): void {
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(WEDDING_ID_KEY);
}
