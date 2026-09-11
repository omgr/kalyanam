/**
 * The digital invitation card, and getting it to guests.
 *
 * The honest limit: a web page cannot send three hundred WhatsApp messages by
 * itself. There is no browser API for it, and the services that do it charge
 * per message and need a server - which this app deliberately does not have.
 *
 * What a browser *can* do is open one pre-filled message at a time, with the
 * guest's number and your wording already in place. So sending is one tap per
 * guest rather than one typing job per guest, and the app keeps track of who
 * has been sent to. For a wedding list that is the difference between an
 * evening's work and ten minutes.
 */

import type { Guest, Wedding } from "@/lib/db/schema";

export const MAX_INVITATION_BYTES = 3 * 1024 * 1024; // 3MB, comfortably under IndexedDB limits

export interface InvitationCard {
  /** Data URL - stored inline so it syncs with everything else. */
  image: string;
  filename: string;
  type: string;
  size: number;
  addedAt: Date;
}

/** Read an image file into a data URL, with a friendly size limit. */
export function readInvitationImage(file: File): Promise<InvitationCard> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Choose an image file - a JPG or PNG of your invitation card."));
      return;
    }
    if (file.size > MAX_INVITATION_BYTES) {
      reject(
        new Error(
          `That image is ${(file.size / 1024 / 1024).toFixed(1)}MB. Please use one under 3MB so it syncs quickly to family devices.`
        )
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        image: reader.result as string,
        filename: file.name,
        type: file.type,
        size: file.size,
        addedAt: new Date(),
      });
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

/** Strip everything but digits, and add India's country code when it is missing. */
export function toWhatsAppNumber(phone: string | undefined, defaultCountryCode = "91"): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.length === 10) return `${defaultCountryCode}${digits}`;
  // 0-prefixed local numbers, e.g. 09876543210
  if (digits.length === 11 && digits.startsWith("0")) {
    return `${defaultCountryCode}${digits.slice(1)}`;
  }
  return digits;
}

/** Default wording, which the sender can edit before anything is sent. */
export function defaultInvitationMessage(wedding: Wedding | undefined): string {
  if (!wedding) return "We would be honoured by your presence at our wedding.";

  const date = new Date(wedding.weddingDate).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    `With great joy we invite you to the wedding of ${wedding.brideName} and ${wedding.groomName}.\n\n` +
    `${date}` +
    (wedding.venue ? `\n${wedding.venue}` : "") +
    (wedding.city ? `, ${wedding.city}` : "") +
    `\n\nYour blessings and presence would mean a great deal to our families.`
  );
}

/** Personalise by replacing {name} in the message. */
export function personalise(message: string, guest: Pick<Guest, "name">): string {
  return message.replace(/\{name\}/g, guest.name);
}

/**
 * A wa.me link that opens WhatsApp with the number and text already filled in.
 * The image has to be attached by the sender - no browser can attach it for them.
 */
export function whatsAppLink(guest: Pick<Guest, "name" | "phone">, message: string): string | null {
  const number = toWhatsAppNumber(guest.phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(personalise(message, guest))}`;
}

/** Fallback for guests with an email but no usable phone number. */
export function mailtoLink(
  guest: Pick<Guest, "name" | "email">,
  subject: string,
  message: string
): string | null {
  if (!guest.email) return null;
  return `mailto:${guest.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    personalise(message, guest)
  )}`;
}

/** Can this guest be reached at all? */
export function isReachable(guest: Pick<Guest, "phone" | "email">): boolean {
  return Boolean(toWhatsAppNumber(guest.phone) || guest.email);
}

/**
 * Group guests by household so one invitation covers a family.
 *
 * Sending the same card to five people who live together is how a guest list
 * turns into a nuisance, so grouped guests are offered as a single send to
 * whichever member has a number.
 */
export function groupForSending<T extends Guest>(guests: T[]): Array<{
  key: string;
  label: string;
  members: T[];
  primary: T | undefined;
}> {
  const groups = new Map<string, T[]>();

  for (const guest of guests) {
    const key = guest.groupName?.trim() || `__solo_${guest.id}`;
    groups.set(key, [...(groups.get(key) ?? []), guest]);
  }

  return Array.from(groups.entries()).map(([key, members]) => ({
    key,
    label: key.startsWith("__solo_") ? members[0].name : key,
    members,
    primary: members.find((m) => toWhatsAppNumber(m.phone)) ?? members.find((m) => m.email),
  }));
}
