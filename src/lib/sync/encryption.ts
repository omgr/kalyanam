/**
 * End-to-end encryption utilities for data sync
 * Uses Web Crypto API (available in all modern browsers)
 */

// Generate a random encryption key
export async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

// Export key to base64 string (for sharing)
export async function exportKey(key: CryptoKey): Promise<string> {
  const rawKey = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawKey))));
}

// Import key from base64 string
export async function importKey(keyString: string): Promise<CryptoKey> {
  const rawKey = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Encrypt data
export async function encryptData(data: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(data);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode.apply(null, Array.from(combined)));
}

// Decrypt data
export async function decryptData(encryptedString: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedString), c => c.charCodeAt(0));
  
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
  
  return new TextDecoder().decode(decrypted);
}

// Generate a short sync code (6 characters)
export function generateSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, I, 1)
  let code = '';
  const array = crypto.getRandomValues(new Uint8Array(6));
  for (let i = 0; i < 6; i++) {
    code += chars[array[i] % chars.length];
  }
  return code;
}

// Hash a sync code to create a room ID
export async function hashSyncCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code.toUpperCase());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 32);
}

