/**
 * Family Room Connection Manager
 * 
 * Handles WebRTC connections for the Family Room feature
 * with auto-reconnection and presence detection.
 */

import Peer, { DataConnection } from 'peerjs';
import { db } from '@/lib/db/schema';
import { activateWedding } from '@/lib/session';
import {
  FamilyDevice,
  FamilyRoomMessage,
  SyncChange,
  getDeviceId,
  getDeviceName,
  getPairedDevices,
  savePairedDevice,
  getPendingChanges,
  markChangesSynced,
  applyIncomingChanges,
  collectFullSyncData,
  generateRoomCode,
} from './family-room';

export interface FamilyRoomCallbacks {
  onDeviceJoined?: (device: FamilyDevice) => void;
  onDeviceLeft?: (deviceId: string) => void;
  onDeviceOnline?: (device: FamilyDevice) => void;
  onDeviceOffline?: (deviceId: string) => void;
  onSyncStarted?: () => void;
  onSyncProgress?: (progress: number, message: string) => void;
  onSyncComplete?: (stats: { received: number; sent: number; conflicts: number }) => void;
  onSyncError?: (error: string) => void;
  onConnectionStateChange?: (state: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  onPendingChangesUpdate?: (count: number) => void;
}

export class FamilyRoomConnection {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private roomCode: string = '';
  private weddingId: string = '';
  private isHost: boolean = false;
  private callbacks: FamilyRoomCallbacks = {};
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connectedDevices: Map<string, FamilyDevice> = new Map();
  private memberName: string = '';
  
  constructor(weddingId: string, memberName?: string) {
    this.weddingId = weddingId;
    this.memberName = memberName || '';
  }
  
  setCallbacks(callbacks: FamilyRoomCallbacks): void {
    this.callbacks = callbacks;
  }
  
  // Create a new Family Room (host mode)
  async createRoom(): Promise<string> {
    this.isHost = true;
    this.roomCode = generateRoomCode();
    
    await this.initializePeer(`kalyanam-${this.roomCode}-host`);
    this.startHeartbeat();
    
    return this.roomCode;
  }
  
  // Join an existing Family Room
  async joinRoom(roomCode: string): Promise<void> {
    this.isHost = false;
    this.roomCode = roomCode.toUpperCase();
    
    await this.initializePeer(`kalyanam-${getDeviceId().substring(0, 8)}`);
    
    // Connect to host
    this.callbacks.onConnectionStateChange?.('connecting');
    
    const hostPeerId = `kalyanam-${this.roomCode}-host`;
    await this.connectToPeer(hostPeerId);
  }
  
  // Initialize PeerJS
  private initializePeer(peerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use free PeerJS cloud server for signaling
      this.peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
          ],
        },
      });
      
      this.peer.on('open', (id) => {
        console.log('Peer opened with ID:', id);
        this.callbacks.onConnectionStateChange?.('connected');
        resolve();
      });
      
      this.peer.on('connection', (conn) => {
        this.handleIncomingConnection(conn);
      });
      
      this.peer.on('error', (err) => {
        console.error('Peer error:', err);
        
        if (err.type === 'peer-unavailable') {
          this.callbacks.onSyncError?.('The host device is not online. Please ensure both devices are connected and try again.');
          this.callbacks.onConnectionStateChange?.('error');
        } else if (err.type === 'unavailable-id') {
          // Room code already in use, generate new one
          if (this.isHost) {
            this.roomCode = generateRoomCode();
            this.initializePeer(`kalyanam-${this.roomCode}-host`).then(resolve).catch(reject);
          }
        } else {
          this.callbacks.onSyncError?.(err.message);
          this.callbacks.onConnectionStateChange?.('error');
        }
      });
      
      this.peer.on('disconnected', () => {
        console.log('Peer disconnected, attempting reconnect...');
        this.callbacks.onConnectionStateChange?.('disconnected');
        this.scheduleReconnect();
      });
      
      // Timeout for initial connection
      setTimeout(() => {
        if (!this.peer?.open) {
          reject(new Error('Connection timeout'));
        }
      }, 15000);
    });
  }
  
  // Connect to a peer
  private connectToPeer(peerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.peer) {
        reject(new Error('Peer not initialized'));
        return;
      }
      
      const conn = this.peer.connect(peerId, {
        reliable: true,
        serialization: 'json',
      });
      
      conn.on('open', () => {
        console.log('Connected to peer:', peerId);
        this.handleConnectionOpen(conn);
        resolve();
      });
      
      conn.on('error', (err) => {
        console.error('Connection error:', err);
        reject(err);
      });
      
      // Timeout
      setTimeout(() => {
        if (!conn.open) {
          reject(new Error('Connection timeout - host may be offline'));
        }
      }, 10000);
    });
  }
  
  // Handle incoming connections (for host)
  private handleIncomingConnection(conn: DataConnection): void {
    conn.on('open', () => {
      this.handleConnectionOpen(conn);
    });
    
    conn.on('error', (err) => {
      console.error('Incoming connection error:', err);
    });
  }
  
  // Handle connection open
  private handleConnectionOpen(conn: DataConnection): void {
    this.connections.set(conn.peer, conn);
    
    conn.on('data', (data) => {
      this.handleMessage(conn, data as FamilyRoomMessage);
    });
    
    conn.on('close', () => {
      this.handleConnectionClose(conn.peer);
    });
    
    // Send join message
    this.sendMessage(conn, {
      type: 'join',
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
      memberName: this.memberName,
    });
    
    this.callbacks.onConnectionStateChange?.('connected');
  }
  
  // Handle connection close
  private handleConnectionClose(peerId: string): void {
    this.connections.delete(peerId);
    
    // Find device by peer ID and mark offline
    for (const [deviceId, device] of this.connectedDevices) {
      if (device.peerId === peerId) {
        device.isOnline = false;
        this.callbacks.onDeviceOffline?.(deviceId);
        break;
      }
    }
    
    if (this.connections.size === 0) {
      this.callbacks.onConnectionStateChange?.('disconnected');
    }
  }
  
  // Handle incoming messages
  private async handleMessage(conn: DataConnection, message: FamilyRoomMessage): Promise<void> {
    switch (message.type) {
      case 'join':
        const device: FamilyDevice = {
          id: message.deviceId,
          name: message.deviceName,
          peerId: conn.peer,
          lastSeen: new Date(),
          isOnline: true,
          memberName: message.memberName,
        };
        this.connectedDevices.set(message.deviceId, device);
        savePairedDevice(device);
        this.callbacks.onDeviceJoined?.(device);
        
        // If host, send device list to all
        if (this.isHost) {
          this.broadcastDeviceList();
        }
        break;
        
      case 'leave':
        const leftDevice = this.connectedDevices.get(message.deviceId);
        if (leftDevice) {
          leftDevice.isOnline = false;
          this.callbacks.onDeviceLeft?.(message.deviceId);
        }
        break;
        
      case 'heartbeat':
        const hbDevice = this.connectedDevices.get(message.deviceId);
        if (hbDevice) {
          hbDevice.lastSeen = new Date(message.timestamp);
          hbDevice.isOnline = true;
        }
        break;
        
      case 'request-full-sync':
        this.callbacks.onSyncStarted?.();
        try {
          const data = await collectFullSyncData(this.weddingId);
          this.sendMessage(conn, { type: 'full-sync-data', data });
          this.callbacks.onSyncComplete?.({ received: 0, sent: 1, conflicts: 0 });
        } catch (error) {
          this.callbacks.onSyncError?.('Failed to collect sync data');
        }
        break;
        
      case 'full-sync-data':
        this.callbacks.onSyncStarted?.();
        this.callbacks.onSyncProgress?.(50, 'Applying changes...');
        try {
          await this.applyFullSync(message.data);
          this.callbacks.onSyncComplete?.({ received: 1, sent: 0, conflicts: 0 });
        } catch (error) {
          this.callbacks.onSyncError?.('Failed to apply sync data');
        }
        break;
        
      case 'incremental-changes':
        this.callbacks.onSyncStarted?.();
        const result = await applyIncomingChanges(message.changes);
        this.sendMessage(conn, { type: 'changes-ack', changeIds: message.changes.map(c => c.id) });
        this.callbacks.onSyncComplete?.({ received: result.applied, sent: 0, conflicts: result.conflicts });
        break;
        
      case 'changes-ack':
        markChangesSynced(message.changeIds);
        this.callbacks.onPendingChangesUpdate?.(getPendingChanges().length);
        break;
        
      case 'device-list':
        message.devices.forEach(d => {
          this.connectedDevices.set(d.id, d);
          savePairedDevice(d);
        });
        break;
    }
  }
  
  // Apply full sync data
  private async applyFullSync(data: any): Promise<void> {
    // Import all data, replacing existing
    const { wedding, events, guests, tasks, expenses, budgetCategories, vendors, messages, reminders, familyMembers, followUps, venues } = data;
    
    await db.transaction('rw', 
      [db.weddings, db.events, db.guests, db.tasks, db.expenses, db.budgetCategories, db.vendors, db.messages, db.reminders, db.familyMembers, db.followUps, db.venues],
      async () => {
        // Update or create wedding
        await db.weddings.put(wedding);
        
        // Clear and replace related data
        if (events?.length) {
          await db.events.where('weddingId').equals(wedding.id).delete();
          await db.events.bulkPut(events);
        }
        if (guests?.length) {
          await db.guests.where('weddingId').equals(wedding.id).delete();
          await db.guests.bulkPut(guests);
        }
        if (tasks?.length) {
          await db.tasks.where('weddingId').equals(wedding.id).delete();
          await db.tasks.bulkPut(tasks);
        }
        if (expenses?.length) {
          await db.expenses.where('weddingId').equals(wedding.id).delete();
          await db.expenses.bulkPut(expenses);
        }
        if (budgetCategories?.length) {
          await db.budgetCategories.where('weddingId').equals(wedding.id).delete();
          await db.budgetCategories.bulkPut(budgetCategories);
        }
        if (vendors?.length) {
          await db.vendors.where('weddingId').equals(wedding.id).delete();
          await db.vendors.bulkPut(vendors);
        }
        if (messages?.length) {
          await db.messages.where('weddingId').equals(wedding.id).delete();
          await db.messages.bulkPut(messages);
        }
        if (reminders?.length) {
          await db.reminders.where('weddingId').equals(wedding.id).delete();
          await db.reminders.bulkPut(reminders);
        }
        if (familyMembers?.length) {
          await db.familyMembers.where('weddingId').equals(wedding.id).delete();
          await db.familyMembers.bulkPut(familyMembers);
        }
        if (followUps?.length) {
          await db.followUps.where('weddingId').equals(wedding.id).delete();
          await db.followUps.bulkPut(followUps);
        }
        if (venues?.length) {
          await db.venues.where('weddingId').equals(wedding.id).delete();
          await db.venues.bulkPut(venues);
        }
      }
    );
    
    // Store wedding ID for session
    await activateWedding(wedding.id);
  }
  
  // Send message to a connection
  private sendMessage(conn: DataConnection, message: FamilyRoomMessage): void {
    if (conn.open) {
      conn.send(message);
    }
  }
  
  // Broadcast to all connections
  private broadcast(message: FamilyRoomMessage): void {
    this.connections.forEach(conn => {
      this.sendMessage(conn, message);
    });
  }
  
  // Broadcast device list (host only)
  private broadcastDeviceList(): void {
    const devices = Array.from(this.connectedDevices.values());
    this.broadcast({ type: 'device-list', devices });
  }
  
  // Request full sync from host
  requestFullSync(): void {
    const hostConn = Array.from(this.connections.values())[0];
    if (hostConn) {
      this.sendMessage(hostConn, { type: 'request-full-sync', deviceId: getDeviceId() });
    }
  }
  
  // Send pending changes to all connected devices
  sendPendingChanges(): void {
    const changes = getPendingChanges();
    if (changes.length > 0) {
      this.broadcast({ type: 'incremental-changes', changes });
    }
  }
  
  // Start heartbeat
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.broadcast({
        type: 'heartbeat',
        deviceId: getDeviceId(),
        timestamp: Date.now(),
      });
      
      // Check for stale devices (no heartbeat in 30s)
      const now = Date.now();
      this.connectedDevices.forEach((device, deviceId) => {
        if (device.isOnline && now - device.lastSeen.getTime() > 30000) {
          device.isOnline = false;
          this.callbacks.onDeviceOffline?.(deviceId);
        }
      });
    }, 10000);
  }
  
  // Schedule reconnect
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    
    this.reconnectTimeout = setTimeout(() => {
      if (this.peer && !this.peer.destroyed) {
        this.peer.reconnect();
      }
    }, 5000);
  }
  
  // Get room code
  getRoomCode(): string {
    return this.roomCode;
  }
  
  // Get connected devices
  getConnectedDevices(): FamilyDevice[] {
    return Array.from(this.connectedDevices.values());
  }
  
  // Check if connected
  isConnected(): boolean {
    return this.connections.size > 0;
  }
  
  // Disconnect and cleanup
  disconnect(): void {
    // Send leave message
    this.broadcast({ type: 'leave', deviceId: getDeviceId() });
    
    // Clear intervals
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    
    // Close connections
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
    
    // Destroy peer
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    
    this.callbacks.onConnectionStateChange?.('disconnected');
  }
}

