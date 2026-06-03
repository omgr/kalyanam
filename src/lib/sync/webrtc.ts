/**
 * WebRTC P2P Sync for real-time data transfer between devices
 * Uses public STUN servers for NAT traversal
 */

import { hashSyncCode } from './encryption';

// Public STUN servers (free, no setup required)
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed';
export type PeerRole = 'host' | 'guest';

export interface SyncMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'data' | 'request-data' | 'ack';
  payload: any;
  timestamp: number;
}

export interface PeerConnection {
  state: ConnectionState;
  role: PeerRole;
  syncCode: string;
  onStateChange: (state: ConnectionState) => void;
  onDataReceived: (data: any) => void;
  sendData: (data: any) => void;
  close: () => void;
}

/**
 * Simple signaling using BroadcastChannel (same device/browser) 
 * For cross-device, we use a simple polling-based approach with localStorage
 * In production, you'd want a proper signaling server
 */
class SignalingChannel {
  private syncCode: string;
  private role: PeerRole;
  private onMessage: (msg: SyncMessage) => void;
  private storageKey: string;
  private pollInterval: number | null = null;
  private broadcastChannel: BroadcastChannel | null = null;

  constructor(syncCode: string, role: PeerRole, onMessage: (msg: SyncMessage) => void) {
    this.syncCode = syncCode;
    this.role = role;
    this.onMessage = onMessage;
    this.storageKey = `kalyanam_sync_${syncCode}_${role === 'host' ? 'guest' : 'host'}`;
    
    // Use BroadcastChannel for same-browser sync
    try {
      this.broadcastChannel = new BroadcastChannel(`kalyanam_sync_${syncCode}`);
      this.broadcastChannel.onmessage = (event) => {
        if (event.data.from !== this.role) {
          this.onMessage(event.data.message);
        }
      };
    } catch {
      // BroadcastChannel not available
    }

    // Poll localStorage for cross-browser/cross-device sync
    this.pollInterval = window.setInterval(() => {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        try {
          const messages: SyncMessage[] = JSON.parse(data);
          messages.forEach(msg => this.onMessage(msg));
          localStorage.removeItem(this.storageKey);
        } catch {}
      }
    }, 500);
  }

  send(message: SyncMessage): void {
    // Send via BroadcastChannel
    this.broadcastChannel?.postMessage({ from: this.role, message });

    // Also store in localStorage for cross-browser
    const myStorageKey = `kalyanam_sync_${this.syncCode}_${this.role}`;
    const existing = localStorage.getItem(myStorageKey);
    const messages = existing ? JSON.parse(existing) : [];
    messages.push(message);
    localStorage.setItem(myStorageKey, JSON.stringify(messages));

    // Clean up old messages after 30 seconds
    setTimeout(() => {
      localStorage.removeItem(myStorageKey);
    }, 30000);
  }

  close(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    this.broadcastChannel?.close();
    localStorage.removeItem(`kalyanam_sync_${this.syncCode}_host`);
    localStorage.removeItem(`kalyanam_sync_${this.syncCode}_guest`);
  }
}

/**
 * Create a P2P connection as host (the device sharing data)
 */
export async function createHostConnection(
  syncCode: string,
  callbacks: {
    onStateChange: (state: ConnectionState) => void;
    onDataReceived: (data: any) => void;
    onGuestConnected: () => void;
  }
): Promise<PeerConnection> {
  let state: ConnectionState = 'disconnected';
  let dataChannel: RTCDataChannel | null = null;
  
  const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  
  const updateState = (newState: ConnectionState) => {
    state = newState;
    callbacks.onStateChange(newState);
  };

  // Create signaling channel
  const signaling = new SignalingChannel(syncCode, 'host', async (msg) => {
    try {
      if (msg.type === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(msg.payload));
      } else if (msg.type === 'ice-candidate' && msg.payload) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(msg.payload));
      }
    } catch (error) {
      console.error('Signaling error:', error);
    }
  });

  // Create data channel
  dataChannel = peerConnection.createDataChannel('sync', { 
    ordered: true 
  });

  dataChannel.onopen = () => {
    updateState('connected');
    callbacks.onGuestConnected();
  };

  dataChannel.onclose = () => {
    updateState('disconnected');
  };

  dataChannel.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      callbacks.onDataReceived(data);
    } catch {}
  };

  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      signaling.send({
        type: 'ice-candidate',
        payload: event.candidate.toJSON(),
        timestamp: Date.now(),
      });
    }
  };

  peerConnection.onconnectionstatechange = () => {
    switch (peerConnection.connectionState) {
      case 'connecting':
        updateState('connecting');
        break;
      case 'connected':
        updateState('connected');
        break;
      case 'disconnected':
      case 'failed':
      case 'closed':
        updateState('failed');
        break;
    }
  };

  // Create and send offer
  updateState('connecting');
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  
  signaling.send({
    type: 'offer',
    payload: offer,
    timestamp: Date.now(),
  });

  return {
    state,
    role: 'host',
    syncCode,
    onStateChange: callbacks.onStateChange,
    onDataReceived: callbacks.onDataReceived,
    sendData: (data: any) => {
      if (dataChannel?.readyState === 'open') {
        dataChannel.send(JSON.stringify(data));
      }
    },
    close: () => {
      dataChannel?.close();
      peerConnection.close();
      signaling.close();
      updateState('disconnected');
    },
  };
}

/**
 * Create a P2P connection as guest (the device receiving data)
 */
export async function createGuestConnection(
  syncCode: string,
  callbacks: {
    onStateChange: (state: ConnectionState) => void;
    onDataReceived: (data: any) => void;
    onConnected: () => void;
  }
): Promise<PeerConnection> {
  let state: ConnectionState = 'disconnected';
  let dataChannel: RTCDataChannel | null = null;
  
  const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  
  const updateState = (newState: ConnectionState) => {
    state = newState;
    callbacks.onStateChange(newState);
  };

  updateState('connecting');

  // Create signaling channel
  const signaling = new SignalingChannel(syncCode, 'guest', async (msg) => {
    try {
      if (msg.type === 'offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(msg.payload));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        signaling.send({
          type: 'answer',
          payload: answer,
          timestamp: Date.now(),
        });
      } else if (msg.type === 'ice-candidate' && msg.payload) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(msg.payload));
      }
    } catch (error) {
      console.error('Signaling error:', error);
    }
  });

  // Handle incoming data channel
  peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    
    dataChannel.onopen = () => {
      updateState('connected');
      callbacks.onConnected();
    };

    dataChannel.onclose = () => {
      updateState('disconnected');
    };

    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callbacks.onDataReceived(data);
      } catch {}
    };
  };

  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      signaling.send({
        type: 'ice-candidate',
        payload: event.candidate.toJSON(),
        timestamp: Date.now(),
      });
    }
  };

  peerConnection.onconnectionstatechange = () => {
    switch (peerConnection.connectionState) {
      case 'connecting':
        updateState('connecting');
        break;
      case 'connected':
        updateState('connected');
        break;
      case 'disconnected':
      case 'failed':
      case 'closed':
        updateState('failed');
        break;
    }
  };

  return {
    state,
    role: 'guest',
    syncCode,
    onStateChange: callbacks.onStateChange,
    onDataReceived: callbacks.onDataReceived,
    sendData: (data: any) => {
      if (dataChannel?.readyState === 'open') {
        dataChannel.send(JSON.stringify(data));
      }
    },
    close: () => {
      dataChannel?.close();
      peerConnection.close();
      signaling.close();
      updateState('disconnected');
    },
  };
}

