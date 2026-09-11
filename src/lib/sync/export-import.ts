/**
 * Export/Import functionality for wedding data backup and transfer.
 *
 * Three correctness concerns drive the shape of this module:
 *
 *  1. JSON has no date type. Everything written by JSON.stringify comes back as
 *     an ISO string, and putting those straight into Dexie leaves the indexes
 *     holding a mix of Date and string keys, which makes sorts and range
 *     queries unreliable. Dates are revived explicitly on the way in.
 *  2. Record ids are kept stable across export/import. Minting new ids on every
 *     import made re-importing the same backup create silent duplicates, and it
 *     would make any future device-to-device merge impossible.
 *  3. Writes go through a single transaction, so a failure part-way cannot
 *     leave a wedding row behind with none of its data.
 */

import { db } from '../db/schema';
import { allCultures } from '../cultures';
import { encryptData, decryptData, generateKey, exportKey, importKey } from './encryption';

export const EXPORT_VERSION = '1.1.0';

export interface WeddingExport {
  version: string;
  exportedAt: string;
  weddingId: string;
  data: {
    wedding: any;
    events: any[];
    guests: any[];
    tasks: any[];
    expenses: any[];
    budgetCategories: any[];
    vendors: any[];
    messages: any[];
    reminders: any[];
    familyMembers: any[];
    followUps: any[];
    venues: any[];
    /** Added in 1.1.0 - absent in files written by earlier versions. */
    paymentPlans?: any[];
    cultures?: any[];
  };
}

export interface ExportResult {
  success: boolean;
  filename?: string;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  weddingId?: string;
  weddingName?: string;
  /** Set when the import was refused because the wedding is already here. */
  alreadyExists?: boolean;
  stats?: {
    events: number;
    guests: number;
    tasks: number;
    expenses: number;
    vendors: number;
  };
  error?: string;
}

// ============================================
// DATE HANDLING
// ============================================

/**
 * Fields that hold Date values, per collection. Anything listed here is
 * converted back from its ISO string on import.
 */
const DATE_FIELDS: Record<string, string[]> = {
  wedding: ['weddingDate', 'createdAt', 'updatedAt'],
  events: ['date', 'createdAt', 'updatedAt'],
  guests: ['rsvpDate', 'createdAt', 'updatedAt'],
  tasks: ['dueDate', 'reminderDate', 'completedAt', 'createdAt', 'updatedAt'],
  expenses: ['dueDate', 'reconciledAt', 'createdAt', 'updatedAt'],
  budgetCategories: ['createdAt', 'updatedAt'],
  vendors: ['contractDate', 'serviceDate', 'createdAt', 'updatedAt'],
  messages: ['createdAt'],
  reminders: ['scheduledFor', 'triggeredAt', 'createdAt'],
  familyMembers: ['locationUpdatedAt', 'createdAt', 'updatedAt'],
  followUps: ['dueDate', 'reminderDate', 'completedAt', 'createdAt', 'updatedAt'],
  venues: ['createdAt', 'updatedAt'],
  paymentPlans: ['startDate', 'nextDueDate', 'createdAt', 'updatedAt'],
  cultures: ['createdAt', 'updatedAt'],
};

/** Nested arrays of objects that carry their own date fields. */
const NESTED_DATE_FIELDS: Record<string, Record<string, string[]>> = {
  events: { checklist: ['dueDate'], attachments: ['createdAt'] },
  tasks: { subtasks: ['completedAt'], comments: ['createdAt'], attachments: ['createdAt'] },
  expenses: { paymentSchedule: ['dueDate', 'paidDate'], receipts: ['createdAt'] },
  paymentPlans: { installments: ['dueDate', 'paidDate'] },
};

function toDate(value: any): any {
  if (value === null || value === undefined || value instanceof Date) return value;
  if (typeof value !== 'string') return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed;
}

/** Revive every known date field on a record from the given collection. */
function reviveDates<T>(collection: string, record: T): T {
  if (!record || typeof record !== 'object') return record;
  const out: any = { ...record };

  for (const field of DATE_FIELDS[collection] ?? []) {
    if (field in out) out[field] = toDate(out[field]);
  }

  for (const [arrayField, fields] of Object.entries(NESTED_DATE_FIELDS[collection] ?? {})) {
    if (Array.isArray(out[arrayField])) {
      out[arrayField] = out[arrayField].map((item: any) => {
        if (!item || typeof item !== 'object') return item;
        const nested = { ...item };
        for (const field of fields) {
          if (field in nested) nested[field] = toDate(nested[field]);
        }
        return nested;
      });
    }
  }

  // Cultures embed rituals, which carry no dates but should survive untouched.
  return out;
}

function reviveAll(collection: string, records: any[] | undefined): any[] {
  return (records ?? []).map((r) => reviveDates(collection, r));
}

// ============================================
// EXPORT
// ============================================

/**
 * Export all data for a wedding.
 */
export async function exportWeddingData(
  weddingId: string,
  options: { encrypt?: boolean; password?: string } = {}
): Promise<{ data: string; filename: string; encrypted: boolean }> {
  const wedding = await db.weddings.get(weddingId);
  if (!wedding) throw new Error('Wedding not found');

  const byWedding = <T>(table: any) =>
    table.where('weddingId').equals(weddingId).toArray() as Promise<T[]>;

  const [
    events, guests, tasks, expenses, budgetCategories, vendors,
    messages, reminders, familyMembers, followUps, venues, paymentPlans,
  ] = await Promise.all([
    byWedding(db.events),
    byWedding(db.guests),
    byWedding(db.tasks),
    byWedding(db.expenses),
    byWedding(db.budgetCategories),
    byWedding(db.vendors),
    byWedding(db.messages),
    byWedding(db.reminders),
    byWedding(db.familyMembers),
    byWedding(db.followUps),
    byWedding(db.venues),
    // paymentPlans holds the installment schedules - omitting it from the
    // export silently lost every payment plan on restore.
    byWedding(db.paymentPlans),
  ]);

  // Carry the culture template too, otherwise a custom culture is unrecoverable.
  const culture = wedding.cultureId ? await db.cultures.get(wedding.cultureId) : undefined;

  const exportData: WeddingExport = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    weddingId,
    data: {
      wedding,
      events, guests, tasks, expenses, budgetCategories, vendors,
      messages, reminders, familyMembers, followUps, venues,
      paymentPlans,
      cultures: culture ? [culture] : [],
    },
  };

  let jsonString = JSON.stringify(exportData, null, 2);
  let encrypted = false;

  if (options.encrypt && options.password) {
    const key = await generateKey();
    jsonString = await encryptData(jsonString, key);
    const keyString = await exportKey(key);
    jsonString = `${keyString}:${jsonString}`;
    encrypted = true;
  }

  const safeName = wedding.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const date = new Date().toISOString().split('T')[0];
  const ext = encrypted ? 'kalyanam.enc' : 'kalyanam.json';

  return { data: jsonString, filename: `${safeName}_${date}.${ext}`, encrypted };
}

/**
 * Download export as file
 */
export function downloadExport(data: string, filename: string): void {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================
// IMPORT
// ============================================

/**
 * Import wedding data from a backup file or a synced payload.
 *
 * `mode: 'new'` adds a wedding this device does not have yet. If the wedding is
 * already present the import is refused rather than duplicated - the caller can
 * retry with `replaceExisting` to overwrite it.
 */
export async function importWeddingData(
  fileContent: string,
  options: {
    mode: 'new' | 'merge' | 'replace';
    targetWeddingId?: string;
    replaceExisting?: boolean;
  } = { mode: 'new' }
): Promise<ImportResult> {
  try {
    let jsonString = fileContent;

    if (fileContent.includes(':') && !fileContent.startsWith('{')) {
      const [keyString, encryptedData] = fileContent.split(':');
      const key = await importKey(keyString);
      jsonString = await decryptData(encryptedData, key);
    }

    const exportData: WeddingExport = JSON.parse(jsonString);

    if (!exportData.version || !exportData.data || !exportData.data.wedding) {
      throw new Error('Invalid export file format');
    }

    const d = exportData.data;
    const wedding = reviveDates('wedding', d.wedding);

    const collections: [string, any, any[]][] = [
      ['events', db.events, reviveAll('events', d.events)],
      ['guests', db.guests, reviveAll('guests', d.guests)],
      ['tasks', db.tasks, reviveAll('tasks', d.tasks)],
      ['expenses', db.expenses, reviveAll('expenses', d.expenses)],
      ['budgetCategories', db.budgetCategories, reviveAll('budgetCategories', d.budgetCategories)],
      ['vendors', db.vendors, reviveAll('vendors', d.vendors)],
      ['messages', db.messages, reviveAll('messages', d.messages)],
      ['reminders', db.reminders, reviveAll('reminders', d.reminders)],
      ['familyMembers', db.familyMembers, reviveAll('familyMembers', d.familyMembers)],
      ['followUps', db.followUps, reviveAll('followUps', d.followUps)],
      ['venues', db.venues, reviveAll('venues', d.venues)],
      ['paymentPlans', db.paymentPlans, reviveAll('paymentPlans', d.paymentPlans)],
    ];

    let targetId: string;
    let replacing = false;

    if (options.mode === 'replace' && options.targetWeddingId) {
      targetId = options.targetWeddingId;
      replacing = true;
    } else if (options.mode === 'new') {
      // Ids are preserved, so importing a wedding that is already here would
      // otherwise duplicate or collide. Detect it and let the caller decide.
      targetId = wedding.id;
      const existing = await db.weddings.get(targetId);
      if (existing && !options.replaceExisting) {
        return {
          success: false,
          alreadyExists: true,
          weddingId: targetId,
          weddingName: wedding.name,
          error: `"${wedding.name}" is already on this device. Choose replace to overwrite it with this backup.`,
        };
      }
      replacing = Boolean(existing);
    } else {
      throw new Error('Invalid import mode or missing target wedding ID');
    }

    const withWeddingId = (items: any[]) => items.map((item) => ({ ...item, weddingId: targetId }));

    // One transaction: either the whole wedding lands or none of it does.
    await db.transaction(
      'rw',
      [db.weddings, db.cultures, ...collections.map(([, table]) => table)],
      async () => {
        if (replacing) {
          for (const [, table] of collections) {
            await table.where('weddingId').equals(targetId).delete();
          }
        }

        await db.weddings.put({ ...wedding, id: targetId });

        for (const [, table, records] of collections) {
          if (records.length) await table.bulkPut(withWeddingId(records));
        }

        // Culture templates are shared, not wedding-scoped; keep any we're given.
        for (const culture of reviveAll('cultures', d.cultures)) {
          if (culture?.id) await db.cultures.put(culture);
        }

        // Backups written before 1.1.0 carry no culture. Re-seed the built-in
        // template so a restored wedding still resolves its rituals.
        if (wedding.cultureId && !(await db.cultures.get(wedding.cultureId))) {
          const builtIn = allCultures.find((c) => c.id === wedding.cultureId);
          if (builtIn) await db.cultures.put(builtIn as any);
        }
      }
    );

    const get = (name: string) => collections.find(([n]) => n === name)?.[2] ?? [];

    return {
      success: true,
      weddingId: targetId,
      weddingName: wedding.name,
      stats: {
        events: get('events').length,
        guests: get('guests').length,
        tasks: get('tasks').length,
        expenses: get('expenses').length,
        vendors: get('vendors').length,
      },
    };
  } catch (error) {
    console.error('Import error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Read file content from File object
 */
export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
