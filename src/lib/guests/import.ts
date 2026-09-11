/**
 * Getting a guest list into Kalyanam without typing three hundred names.
 *
 * Three routes, because no single one works everywhere:
 *
 *   Contact Picker  one tap per guest, but it only exists in Chrome on Android.
 *   CSV / vCard     works everywhere, and is what people already have - every
 *                   phone exports contacts as .vcf, every spreadsheet as .csv.
 *   Manual          still there for the handful nobody has a number for.
 */

import type { Guest } from "@/lib/db/schema";

export type GuestDraft = Pick<Guest, "name"> &
  Partial<Pick<Guest, "phone" | "email" | "side" | "groupName" | "relation" | "plusOnes">>;

// ---------------------------------------------------------------------------
// Contact Picker
// ---------------------------------------------------------------------------

interface ContactsManager {
  select: (
    properties: string[],
    options?: { multiple?: boolean }
  ) => Promise<Array<{ name?: string[]; tel?: string[]; email?: string[] }>>;
  getProperties: () => Promise<string[]>;
}

function contactsApi(): ContactsManager | null {
  if (typeof navigator === "undefined") return null;
  const api = (navigator as unknown as { contacts?: ContactsManager }).contacts;
  return api && typeof api.select === "function" ? api : null;
}

/** Chrome on Android only, and only in a secure context. */
export function isContactPickerSupported(): boolean {
  return contactsApi() !== null;
}

/**
 * Open the phone's own contact picker.
 *
 * Nothing is read until the person chooses; the browser never exposes the
 * address book, only what was picked.
 */
export async function pickFromContacts(): Promise<GuestDraft[]> {
  const api = contactsApi();
  if (!api) throw new Error("This browser cannot open your contacts.");

  const available = await api.getProperties().catch(() => ["name", "tel", "email"]);
  const wanted = ["name", "tel", "email"].filter((p) => available.includes(p));

  const picked = await api.select(wanted, { multiple: true });

  return picked
    .map((c) => ({
      name: c.name?.[0]?.trim() ?? "",
      phone: c.tel?.[0]?.trim() || undefined,
      email: c.email?.[0]?.trim() || undefined,
    }))
    .filter((g) => g.name.length > 0);
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/** Split one CSV line, honouring quotes so "Rao, Venkat" stays a single field. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(field.trim());
      field = "";
    } else field += ch;
  }
  out.push(field.trim());
  return out;
}

const HEADER_ALIASES: Record<string, keyof GuestDraft> = {
  name: "name", "full name": "name", "first name": "name", guest: "name", "guest name": "name",
  phone: "phone", mobile: "phone", "phone number": "phone", "mobile number": "phone",
  contact: "phone", number: "phone", "phone 1 - value": "phone",
  email: "email", "e-mail": "email", "email address": "email", "e-mail 1 - value": "email",
  side: "side", relation: "relation", relationship: "relation",
  group: "groupName", family: "groupName", "group name": "groupName", household: "groupName",
};

function normaliseSide(value: string | undefined): Guest["side"] | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  // "both" must be tested before the "b" shortcut, or it reads as "bride".
  if (v.startsWith("both") || v.startsWith("m") || v === "common") return "mutual";
  if (v.startsWith("b")) return "bride";
  if (v.startsWith("g")) return "groom";
  return undefined;
}

/**
 * Parse a CSV export. Headers are matched loosely, so a Google Contacts export
 * and a hand-made spreadsheet both work without anyone renaming columns.
 */
export function parseGuestCsv(text: string): { guests: GuestDraft[]; skipped: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { guests: [], skipped: 0 };

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const mapped = header.map((h) => HEADER_ALIASES[h]);
  const hasHeader = mapped.some((m) => m === "name");

  const rows = hasHeader ? lines.slice(1) : lines;
  const guests: GuestDraft[] = [];
  let skipped = 0;

  for (const line of rows) {
    const cells = parseCsvLine(line);
    const draft: GuestDraft = { name: "" };

    if (hasHeader) {
      cells.forEach((cell, i) => {
        const key = mapped[i];
        if (!key || !cell) return;
        if (key === "side") draft.side = normaliseSide(cell);
        else if (key === "plusOnes") draft.plusOnes = Number(cell) || 0;
        else (draft as Record<string, unknown>)[key] = cell;
      });
    } else {
      // No recognisable header: assume name, phone, email in that order.
      draft.name = cells[0] ?? "";
      draft.phone = cells[1] || undefined;
      draft.email = cells[2] || undefined;
    }

    if (draft.name.trim()) guests.push({ ...draft, name: draft.name.trim() });
    else skipped++;
  }

  return { guests, skipped };
}

// ---------------------------------------------------------------------------
// vCard (.vcf) - what a phone exports
// ---------------------------------------------------------------------------

export function parseVCard(text: string): { guests: GuestDraft[]; skipped: number } {
  // Unfold continuation lines first, per RFC 6350.
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const cards = unfolded.split(/BEGIN:VCARD/i).slice(1);

  const guests: GuestDraft[] = [];
  let skipped = 0;

  for (const card of cards) {
    const value = (prop: string) => {
      const m = card.match(new RegExp(`^${prop}[^:\\r\\n]*:(.*)$`, "im"));
      return m?.[1]?.trim();
    };

    // FN is the display name; N is structured (surname;given;...).
    let name = value("FN");
    if (!name) {
      const parts = value("N")?.split(";") ?? [];
      name = [parts[1], parts[0]].filter(Boolean).join(" ").trim();
    }

    if (!name) {
      skipped++;
      continue;
    }

    guests.push({
      name,
      phone: value("TEL")?.replace(/[^\d+]/g, "") || undefined,
      email: value("EMAIL") || undefined,
    });
  }

  return { guests, skipped };
}

// ---------------------------------------------------------------------------
// Shared post-processing
// ---------------------------------------------------------------------------

/** Digits only, so "+91 98765 43210" and "09876543210" compare equal. */
export function normalisePhone(phone: string | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Remove duplicates within an import and against guests already on the list.
 *
 * Matched on phone where there is one, otherwise on name. Importing a contacts
 * export twice is a normal accident, and it should not double the catering.
 */
export function dedupeGuests(
  drafts: GuestDraft[],
  existing: Array<{ name: string; phone?: string }> = []
): { unique: GuestDraft[]; duplicates: number } {
  const seenPhones = new Set(existing.map((g) => normalisePhone(g.phone)).filter(Boolean));
  const seenNames = new Set(existing.map((g) => g.name.trim().toLowerCase()));

  const unique: GuestDraft[] = [];
  let duplicates = 0;

  for (const draft of drafts) {
    const phone = normalisePhone(draft.phone);
    const name = draft.name.trim().toLowerCase();

    if ((phone && seenPhones.has(phone)) || (!phone && seenNames.has(name))) {
      duplicates++;
      continue;
    }

    if (phone) seenPhones.add(phone);
    seenNames.add(name);
    unique.push(draft);
  }

  return { unique, duplicates };
}

/** Detect the format from the filename or the content itself. */
export function parseGuestFile(
  filename: string,
  content: string
): { guests: GuestDraft[]; skipped: number } {
  const isVCard = /\.vcf$/i.test(filename) || /BEGIN:VCARD/i.test(content.slice(0, 200));
  return isVCard ? parseVCard(content) : parseGuestCsv(content);
}
