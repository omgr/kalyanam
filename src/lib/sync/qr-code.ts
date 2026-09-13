/**
 * QR Code generation and scanning utilities
 * Uses canvas-based generation (no external dependencies)
 */

import { generateSyncCode } from './encryption';

// QR Code data structure
export interface QRSyncData {
  type: 'kalyanam-sync';
  version: 1;
  syncCode: string;
  weddingId: string;
  weddingName: string;
  timestamp: number;
  expiresAt: number; // 5 minutes validity
}

/**
 * Generate QR sync data
 */
export function generateQRSyncData(weddingId: string, weddingName: string): QRSyncData {
  const syncCode = generateSyncCode();
  const now = Date.now();
  
  return {
    type: 'kalyanam-sync',
    version: 1,
    syncCode,
    weddingId,
    weddingName,
    timestamp: now,
    expiresAt: now + 5 * 60 * 1000, // 5 minutes
  };
}

/**
 * Parse QR code data
 */
export function parseQRSyncData(data: string): QRSyncData | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed.type !== 'kalyanam-sync') return null;
    if (Date.now() > parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Generate QR Code as Data URL
 * Uses the qrcode library for proper QR code generation
 */
export async function generateQRCodeDataURL(data: string, size: number = 256): Promise<string> {
  // Dynamic import to avoid SSR issues
  const QRCode = (await import('qrcode')).default;
  
  return await QRCode.toDataURL(data, {
    width: size,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });
}

/**
 * Scan QR code from video stream
 * Uses the browser's BarcodeDetector API if available
 */
export async function scanQRCode(
  videoElement: HTMLVideoElement,
  onResult: (data: string) => void,
  onError: (error: Error) => void
): Promise<() => void> {
  let isScanning = true;
  let animationFrameId: number;

  // Check for BarcodeDetector support
  if ('BarcodeDetector' in window) {
    try {
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      
      const scan = async () => {
        if (!isScanning) return;
        
        try {
          const barcodes = await detector.detect(videoElement);
          if (barcodes.length > 0) {
            onResult(barcodes[0].rawValue);
            return;
          }
        } catch (e) {
          // Continue scanning
        }
        
        animationFrameId = requestAnimationFrame(scan);
      };
      
      scan();
      
      return () => {
        isScanning = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      };
    } catch {
      // BarcodeDetector not supported, fall through to canvas method
    }
  }

  // Fallback for browsers without BarcodeDetector - notably Safari, so every
  // iPhone in the family. Previously this drew frames to a canvas and did
  // nothing with them, so the camera opened and simply never found anything.
  const { default: jsQR } = await import("jsqr");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  const scan = () => {
    if (!isScanning) return;

    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      try {
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(image.data, image.width, image.height, {
          inversionAttempts: "dontInvert",
        });
        if (found?.data) {
          onResult(found.data);
          return;
        }
      } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }

    animationFrameId = requestAnimationFrame(scan);
  };

  scan();

  return () => {
    isScanning = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  };
}


/**
 * Start camera for QR scanning
 */
export async function startCamera(
  videoElement: HTMLVideoElement,
  facingMode: 'user' | 'environment' = 'environment'
): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  
  videoElement.srcObject = stream;
  await videoElement.play();
  
  return stream;
}

/**
 * Stop camera
 */
export function stopCamera(stream: MediaStream): void {
  stream.getTracks().forEach(track => track.stop());
}

