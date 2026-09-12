/**
 * Getting one invitation to three hundred people, for free, from a web page.
 *
 * What is NOT possible, so nobody wastes time looking for it: a website cannot
 * send messages on your behalf. WhatsApp has no client-side API for it; the
 * Cloud API needs a business account, a server and per-message fees. Anything
 * claiming to bulk-send from a browser is either a paid gateway or an
 * unofficial automation that gets numbers banned.
 *
 * What IS possible, and covers a wedding list:
 *
 *   1. Share sheet       navigator.share() hands the card and the wording to
 *                        WhatsApp, whose own picker lets you tick many chats
 *                        at once. One tap here, then as many recipients as you
 *                        like there. Best route on Android.
 *   2. Broadcast list    WhatsApp's own feature: up to 256 people per list,
 *                        free, and each person receives a normal private
 *                        message rather than a group. We cannot create the
 *                        list, but we can hand over the numbers to paste in.
 *   3. Email, BCC        every address at once, and nobody sees the others.
 *
 * Route 2 has one catch worth stating plainly: WhatsApp only delivers a
 * broadcast to people who have your number saved. For family that is usually
 * true, and it is why broadcast is second rather than first.
 */

import type { Guest } from "@/lib/db/schema";
import { toWhatsAppNumber, personalise } from "./invitation";

/** WhatsApp's own cap on a single broadcast list. */
export const BROADCAST_LIST_LIMIT = 256;

/** Conservative cap: some mail clients truncate very long mailto links. */
export const MAILTO_RECIPIENT_LIMIT = 90;

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Every distinct, dialable number on the guest list. */
export function broadcastNumbers(guests: Guest[]): string[] {
  const seen = new Set<string>();
  for (const guest of guests) {
    const number = toWhatsAppNumber(guest.phone);
    if (number) seen.add(`+${number}`);
  }
  return [...seen];
}

/** Numbers split into lists WhatsApp will actually accept. */
export function broadcastBatches(guests: Guest[]): string[][] {
  return chunk(broadcastNumbers(guests), BROADCAST_LIST_LIMIT);
}

/** Every distinct email on the guest list. */
export function emailAddresses(guests: Guest[]): string[] {
  const seen = new Set<string>();
  for (const guest of guests) {
    const email = guest.email?.trim();
    if (email && email.includes("@")) seen.add(email);
  }
  return [...seen];
}

/**
 * mailto: links with everyone in BCC, so no guest sees another's address.
 * Split into batches because a very long URL gets truncated by some clients.
 */
export function bccMailtoLinks(
  guests: Guest[],
  subject: string,
  body: string
): string[] {
  return chunk(emailAddresses(guests), MAILTO_RECIPIENT_LIMIT).map(
    (batch) =>
      `mailto:?bcc=${encodeURIComponent(batch.join(","))}` +
      `&subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`
  );
}

// ---------------------------------------------------------------------------
// Share sheet
// ---------------------------------------------------------------------------

/** Turn the stored data-URL card back into a File the share sheet can take. */
export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const extension = blob.type.split("/")[1] ?? "png";
  const safeName = /\.\w+$/.test(filename) ? filename : `${filename}.${extension}`;
  return new File([blob], safeName, { type: blob.type });
}

export function canShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export function canShareFiles(files: File[]): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}

/**
 * Hand the invitation to the phone's share sheet.
 *
 * From there the person picks WhatsApp - or Telegram, or Signal, or email -
 * and selects as many chats as they like inside that app. That multi-select
 * belongs to WhatsApp, not to us, which is exactly why this works without any
 * API access at all.
 *
 * `{name}` is not substituted here: one share goes to many people, so there is
 * no single name to use.
 */
export async function shareInvitation(options: {
  message: string;
  card?: { image: string; filename: string } | null;
  title?: string;
}): Promise<"shared" | "cancelled" | "unsupported"> {
  if (!canShare()) return "unsupported";

  const text = options.message.replace(/\{name\}/g, "").replace(/\s{2,}/g, " ").trim();
  const payload: ShareData = { text, title: options.title };

  if (options.card) {
    try {
      const file = await dataUrlToFile(options.card.image, options.card.filename);
      if (canShareFiles([file])) payload.files = [file];
    } catch {
      // Fall back to text only rather than failing the whole share.
    }
  }

  try {
    await navigator.share(payload);
    return "shared";
  } catch (error) {
    // AbortError just means the person closed the sheet.
    if (error instanceof Error && error.name === "AbortError") return "cancelled";
    throw error;
  }
}

/** Plain text for a guest who asks "who have you invited?" - and for pasting. */
export function numbersForPasting(numbers: string[]): string {
  return numbers.join("\n");
}

/** Personalised text for one guest, used by the per-household links. */
export function messageFor(guest: Pick<Guest, "name">, message: string): string {
  return personalise(message, guest);
}
