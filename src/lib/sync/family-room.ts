/**
 * Family Room - Persistent P2P sync for family collaboration
 * 
 * Features:
 * - Persistent device pairing (remembered across sessions)
 * - Auto-reconnection when devices come online
 * - Real-time change propagation
 * - Offline change queue
 * - Conflict resolution
 */

import { db } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface FamilyDevice {
  id: string;
  name: string;
  peerId: string;
  lastSeen: Date;
  isOnline: boolean;
  memberName?: string; // Family member using this device
}

export interface SyncChange {
  id: string;
  timestamp: Date;
  table: string;
  operation: 'create' | 'update' | 'delete';
  recordId: string;
  data?: any;
  deviceId: string;
  synced: boolean;
}

export interface FamilyRoomState {
  roomId: string;
  deviceId: string;
  devices: FamilyDevice[];
  isHost: boolean;
  isConnected: boolean;
  pendingChanges: number;
  lastSyncTime?: Date;
}

// Storage keys
const STORAGE_KEYS = {
  DEVICE_ID: 'kalyanam_device_id',
  DEVICE_NAME: 'kalyanam_device_name',
  ROOM_ID: 'kalyanam_room_id',
  PAIRED_DEVICES: 'kalyanam_paired_devices',
  PENDING_CHANGES: 'kalyanam_pending_changes',
  LAST_SYNC: 'kalyanam_last_sync',
};

// Get or create device ID
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
  }
  return deviceId;
}

// Get or set device name
export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Unknown Device';
  
  let name = localStorage.getItem(STORAGE_KEYS.DEVICE_NAME);
  if (!name) {
    // Auto-generate based on browser/platform
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) name = 'iPhone';
    else if (/Android/.test(ua)) name = 'Android Phone';
    else if (/Mac/.test(ua)) name = 'Mac';
    else if (/Windows/.test(ua)) name = 'Windows PC';
    else if (/Linux/.test(ua)) name = 'Linux PC';
    else name = 'Device';
    
    name = `${name} ${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    localStorage.setItem(STORAGE_KEYS.DEVICE_NAME, name);
  }
  return name;
}

export function setDeviceName(name: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.DEVICE_NAME, name);
  }
}

// Get paired devices
export function getPairedDevices(): FamilyDevice[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(STORAGE_KEYS.PAIRED_DEVICES);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Save paired device
export function savePairedDevice(device: FamilyDevice): void {
  if (typeof window === 'undefined') return;
  
  const devices = getPairedDevices();
  const existing = devices.findIndex(d => d.id === device.id);
  
  if (existing >= 0) {
    devices[existing] = { ...devices[existing], ...device };
  } else {
    devices.push(device);
  }
  
  localStorage.setItem(STORAGE_KEYS.PAIRED_DEVICES, JSON.stringify(devices));
}

// Remove paired device
export function removePairedDevice(deviceId: string): void {
  if (typeof window === 'undefined') return;
  
  const devices = getPairedDevices().filter(d => d.id !== deviceId);
  localStorage.setItem(STORAGE_KEYS.PAIRED_DEVICES, JSON.stringify(devices));
}

// Get pending changes
export function getPendingChanges(): SyncChange[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(STORAGE_KEYS.PENDING_CHANGES);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Add pending change
export function addPendingChange(change: Omit<SyncChange, 'id' | 'timestamp' | 'deviceId' | 'synced'>): void {
  if (typeof window === 'undefined') return;
  
  const changes = getPendingChanges();
  changes.push({
    ...change,
    id: uuidv4(),
    timestamp: new Date(),
    deviceId: getDeviceId(),
    synced: false,
  });
  
  localStorage.setItem(STORAGE_KEYS.PENDING_CHANGES, JSON.stringify(changes));
}

// Mark changes as synced
export function markChangesSynced(changeIds: string[]): void {
  if (typeof window === 'undefined') return;
  
  const changes = getPendingChanges().filter(c => !changeIds.includes(c.id));
  localStorage.setItem(STORAGE_KEYS.PENDING_CHANGES, JSON.stringify(changes));
  localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
}

// Get last sync time
export function getLastSyncTime(): Date | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  return stored ? new Date(stored) : null;
}

// Room ID management
export function getRoomId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.ROOM_ID);
}

export function setRoomId(roomId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.ROOM_ID, roomId);
  }
}

export function clearRoomId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.ROOM_ID);
  }
}

// Generate a memorable room code (6 characters)
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Apply incoming changes to local database
export async function applyIncomingChanges(changes: SyncChange[]): Promise<{ applied: number; conflicts: number }> {
  let applied = 0;
  let conflicts = 0;
  
  for (const change of changes) {
    try {
      const table = (db as any)[change.table];
      if (!table) continue;
      
      switch (change.operation) {
        case 'create':
          // Check if already exists
          const existing = await table.get(change.recordId);
          if (!existing) {
            await table.add(change.data);
            applied++;
          } else {
            // Record exists - compare timestamps for conflict resolution
            if (change.timestamp > (existing.updatedAt || existing.createdAt)) {
              await table.put(change.data);
              applied++;
            } else {
              conflicts++;
            }
          }
          break;
          
        case 'update':
          const current = await table.get(change.recordId);
          if (current) {
            // Last-write-wins conflict resolution
            const currentTime = current.updatedAt || current.createdAt || new Date(0);
            if (change.timestamp > currentTime) {
              await table.put(change.data);
              applied++;
            } else {
              conflicts++;
            }
          }
          break;
          
        case 'delete':
          await table.delete(change.recordId);
          applied++;
          break;
      }
    } catch (error) {
      console.error('Error applying change:', error);
      conflicts++;
    }
  }
  
  return { applied, conflicts };
}

// Collect all data for full sync
export async function collectFullSyncData(weddingId: string): Promise<any> {
  const wedding = await db.weddings.get(weddingId);
  if (!wedding) throw new Error('Wedding not found');
  
  const [
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
  ] = await Promise.all([
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
  
  return {
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
    syncedAt: new Date().toISOString(),
    deviceId: getDeviceId(),
    deviceName: getDeviceName(),
  };
}

// Message types for Family Room communication
export type FamilyRoomMessage = 
  | { type: 'join'; deviceId: string; deviceName: string; memberName?: string }
  | { type: 'leave'; deviceId: string }
  | { type: 'heartbeat'; deviceId: string; timestamp: number }
  | { type: 'request-full-sync'; deviceId: string }
  | { type: 'full-sync-data'; data: any }
  | { type: 'incremental-changes'; changes: SyncChange[] }
  | { type: 'changes-ack'; changeIds: string[] }
  | { type: 'device-list'; devices: FamilyDevice[] };

