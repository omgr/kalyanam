/**
 * Export/Import functionality for wedding data backup and transfer
 */

import { db } from '../db/schema';
import { encryptData, decryptData, generateKey, exportKey, importKey } from './encryption';

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
  stats?: {
    events: number;
    guests: number;
    tasks: number;
    expenses: number;
    vendors: number;
  };
  error?: string;
}

/**
 * Export all data for a wedding
 */
export async function exportWeddingData(
  weddingId: string,
  options: { encrypt?: boolean; password?: string } = {}
): Promise<{ data: string; filename: string; encrypted: boolean }> {
  // Gather all data
  const wedding = await db.weddings.get(weddingId);
  if (!wedding) throw new Error('Wedding not found');

  const [events, guests, tasks, expenses, budgetCategories, vendors, messages, reminders, familyMembers, followUps, venues] = await Promise.all([
    db.events.where('weddingId').equals(weddingId).toArray(),
    db.guests.where('weddingId').equals(weddingId).toArray(),
    db.tasks.where('weddingId').equals(weddingId).toArray(),
    db.expenses.where('weddingId').equals(weddingId).toArray(),
    db.budgetCategories.where('weddingId').equals(weddingId).toArray(),
    db.vendors.where('weddingId').equals(weddingId).toArray(),
    db.messages.where('weddingId').equals(weddingId).toArray(),
    db.reminders.where('weddingId').equals(weddingId).toArray(),
    db.familyMembers.where('weddingId').equals(weddingId).toArray(),
    db.followUps.where('weddingId').equals(weddingId).toArray(),
    db.venues.where('weddingId').equals(weddingId).toArray(),
  ]);

  const exportData: WeddingExport = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    weddingId,
    data: {
      wedding,
      events,
      guests,
      tasks,
      expenses,
      budgetCategories,
      vendors,
      messages,
      reminders,
      familyMembers,
      followUps,
      venues,
    },
  };

  let jsonString = JSON.stringify(exportData, null, 2);
  let encrypted = false;

  // Optionally encrypt
  if (options.encrypt && options.password) {
    const key = await generateKey();
    jsonString = await encryptData(jsonString, key);
    // Prepend key (in real app, this should be shared separately)
    const keyString = await exportKey(key);
    jsonString = `${keyString}:${jsonString}`;
    encrypted = true;
  }

  // Generate filename
  const safeName = wedding.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const date = new Date().toISOString().split('T')[0];
  const ext = encrypted ? 'kalyanam.enc' : 'kalyanam.json';
  const filename = `${safeName}_${date}.${ext}`;

  return { data: jsonString, filename, encrypted };
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

/**
 * Import wedding data from file
 */
export async function importWeddingData(
  fileContent: string,
  options: { 
    mode: 'new' | 'merge' | 'replace';
    targetWeddingId?: string;
  } = { mode: 'new' }
): Promise<ImportResult> {
  try {
    let jsonString = fileContent;

    // Check if encrypted (contains key prefix)
    if (fileContent.includes(':') && !fileContent.startsWith('{')) {
      const [keyString, encryptedData] = fileContent.split(':');
      const key = await importKey(keyString);
      jsonString = await decryptData(encryptedData, key);
    }

    const exportData: WeddingExport = JSON.parse(jsonString);

    // Validate structure
    if (!exportData.version || !exportData.data || !exportData.data.wedding) {
      throw new Error('Invalid export file format');
    }

    const { wedding, events, guests, tasks, expenses, budgetCategories, vendors, messages, reminders, familyMembers, followUps, venues } = exportData.data;

    let targetId: string;

    if (options.mode === 'new') {
      // Create new wedding with new ID
      targetId = crypto.randomUUID();
      
      // Update wedding ID
      const newWedding = { ...wedding, id: targetId };
      await db.weddings.add(newWedding);

      // Helper to update weddingId references
      const updateRef = (items: any[]) => items.map(item => ({ ...item, weddingId: targetId }));

      // Add all related data
      if (events.length) await db.events.bulkAdd(updateRef(events));
      if (guests.length) await db.guests.bulkAdd(updateRef(guests));
      if (tasks.length) await db.tasks.bulkAdd(updateRef(tasks));
      if (expenses.length) await db.expenses.bulkAdd(updateRef(expenses));
      if (budgetCategories.length) await db.budgetCategories.bulkAdd(updateRef(budgetCategories));
      if (vendors.length) await db.vendors.bulkAdd(updateRef(vendors));
      if (messages.length) await db.messages.bulkAdd(updateRef(messages));
      if (reminders.length) await db.reminders.bulkAdd(updateRef(reminders));
      if (familyMembers.length) await db.familyMembers.bulkAdd(updateRef(familyMembers));
      if (followUps.length) await db.followUps.bulkAdd(updateRef(followUps));
      if (venues.length) await db.venues.bulkAdd(updateRef(venues));

    } else if (options.mode === 'replace' && options.targetWeddingId) {
      // Replace existing wedding data
      targetId = options.targetWeddingId;

      // Delete existing data
      await Promise.all([
        db.events.where('weddingId').equals(targetId).delete(),
        db.guests.where('weddingId').equals(targetId).delete(),
        db.tasks.where('weddingId').equals(targetId).delete(),
        db.expenses.where('weddingId').equals(targetId).delete(),
        db.budgetCategories.where('weddingId').equals(targetId).delete(),
        db.vendors.where('weddingId').equals(targetId).delete(),
        db.messages.where('weddingId').equals(targetId).delete(),
        db.reminders.where('weddingId').equals(targetId).delete(),
        db.familyMembers.where('weddingId').equals(targetId).delete(),
        db.followUps.where('weddingId').equals(targetId).delete(),
        db.venues.where('weddingId').equals(targetId).delete(),
      ]);

      // Update and replace
      const updateRef = (items: any[]) => items.map(item => ({ ...item, weddingId: targetId }));
      
      await db.weddings.update(targetId, { ...wedding, id: targetId });
      if (events.length) await db.events.bulkAdd(updateRef(events));
      if (guests.length) await db.guests.bulkAdd(updateRef(guests));
      if (tasks.length) await db.tasks.bulkAdd(updateRef(tasks));
      if (expenses.length) await db.expenses.bulkAdd(updateRef(expenses));
      if (budgetCategories.length) await db.budgetCategories.bulkAdd(updateRef(budgetCategories));
      if (vendors.length) await db.vendors.bulkAdd(updateRef(vendors));
      if (messages.length) await db.messages.bulkAdd(updateRef(messages));
      if (reminders.length) await db.reminders.bulkAdd(updateRef(reminders));
      if (familyMembers.length) await db.familyMembers.bulkAdd(updateRef(familyMembers));
      if (followUps.length) await db.followUps.bulkAdd(updateRef(followUps));
      if (venues.length) await db.venues.bulkAdd(updateRef(venues));

    } else {
      throw new Error('Invalid import mode or missing target wedding ID');
    }

    return {
      success: true,
      weddingId: targetId,
      weddingName: wedding.name,
      stats: {
        events: events.length,
        guests: guests.length,
        tasks: tasks.length,
        expenses: expenses.length,
        vendors: vendors.length,
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

