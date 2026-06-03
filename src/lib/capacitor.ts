/**
 * Capacitor utilities for mobile-specific features
 * These functions gracefully degrade on web
 */

// Check if running in Capacitor native environment
export function isNative(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

// Get current platform
export function getPlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web';
  const capacitor = (window as any).Capacitor;
  if (!capacitor) return 'web';
  return capacitor.getPlatform?.() || 'web';
}

// Check if PWA is installed
export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

// ============================================
// CAMERA UTILITIES
// ============================================

export async function takePhoto(): Promise<string | null> {
  try {
    if (isNative()) {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });
      return photo.base64String ? `data:image/jpeg;base64,${photo.base64String}` : null;
    }
    // Fallback: return null and let the UI handle file input
    return null;
  } catch (error) {
    console.error('Camera error:', error);
    return null;
  }
}

export async function pickFromGallery(): Promise<string | null> {
  try {
    if (isNative()) {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
      });
      return photo.base64String ? `data:image/jpeg;base64,${photo.base64String}` : null;
    }
    return null;
  } catch (error) {
    console.error('Gallery error:', error);
    return null;
  }
}

// ============================================
// GEOLOCATION UTILITIES
// ============================================

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export async function getCurrentLocation(): Promise<LocationCoords | null> {
  try {
    if (isNative()) {
      const { Geolocation } = await import('@capacitor/geolocation');
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
    }
    
    // Fallback to browser geolocation
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  } catch (error) {
    console.error('Geolocation error:', error);
    return null;
  }
}

// ============================================
// LOCAL NOTIFICATIONS
// ============================================

export interface NotificationOptions {
  id: number;
  title: string;
  body: string;
  schedule?: Date;
  extra?: Record<string, any>;
}

export async function scheduleNotification(options: NotificationOptions): Promise<void> {
  try {
    if (isNative()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      // Request permission first
      const permResult = await LocalNotifications.requestPermissions();
      if (permResult.display !== 'granted') {
        console.warn('Notification permission not granted');
        return;
      }
      
      await LocalNotifications.schedule({
        notifications: [
          {
            id: options.id,
            title: options.title,
            body: options.body,
            schedule: options.schedule ? { at: options.schedule } : undefined,
            extra: options.extra,
          },
        ],
      });
    } else if ('Notification' in window) {
      // Web fallback - only works if notifications are permitted
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        if (options.schedule && options.schedule > new Date()) {
          // Schedule for later
          const delay = options.schedule.getTime() - Date.now();
          setTimeout(() => {
            new Notification(options.title, { body: options.body });
          }, delay);
        } else {
          new Notification(options.title, { body: options.body });
        }
      }
    }
  } catch (error) {
    console.error('Notification error:', error);
  }
}

export async function cancelNotification(id: number): Promise<void> {
  try {
    if (isNative()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.cancel({ notifications: [{ id }] });
    }
  } catch (error) {
    console.error('Cancel notification error:', error);
  }
}

// ============================================
// HAPTIC FEEDBACK
// ============================================

export async function hapticFeedback(style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> {
  try {
    if (isNative()) {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      const impactStyle = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      }[style];
      await Haptics.impact({ style: impactStyle });
    } else if (navigator.vibrate) {
      // Web fallback
      const duration = { light: 10, medium: 25, heavy: 50 }[style];
      navigator.vibrate(duration);
    }
  } catch (error) {
    // Haptics not available
  }
}

// ============================================
// SHARE
// ============================================

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
}

export async function share(options: ShareOptions): Promise<boolean> {
  try {
    if (isNative()) {
      const { Share } = await import('@capacitor/share');
      await Share.share(options);
      return true;
    } else if (navigator.share) {
      await navigator.share(options);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Share error:', error);
    return false;
  }
}

// ============================================
// STATUS BAR (Mobile only)
// ============================================

export async function setStatusBarColor(color: string): Promise<void> {
  try {
    if (isNative()) {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      await StatusBar.setBackgroundColor({ color });
    }
  } catch (error) {
    // Not available
  }
}

// ============================================
// APP LIFECYCLE
// ============================================

export type AppStateListener = (isActive: boolean) => void;

let appStateListeners: AppStateListener[] = [];

export function onAppStateChange(listener: AppStateListener): () => void {
  appStateListeners.push(listener);
  
  // Set up listener if first one
  if (appStateListeners.length === 1) {
    if (isNative()) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appStateChange', ({ isActive }) => {
          appStateListeners.forEach(l => l(isActive));
        });
      });
    } else {
      // Web fallback
      document.addEventListener('visibilitychange', () => {
        const isActive = document.visibilityState === 'visible';
        appStateListeners.forEach(l => l(isActive));
      });
    }
  }
  
  // Return unsubscribe function
  return () => {
    appStateListeners = appStateListeners.filter(l => l !== listener);
  };
}

