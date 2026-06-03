import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kalyanam.app',
  appName: 'Kalyanam',
  webDir: 'out',
  
  // Server configuration for development
  server: {
    // For development, you can use your local IP
    // url: 'http://192.168.1.100:3000',
    // cleartext: true,
    androidScheme: 'https',
  },
  
  // Plugins configuration
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#FEF2F2', // saffron-50
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      spinnerColor: '#DC2626', // primary red
    },
    
    StatusBar: {
      backgroundColor: '#DC2626',
      style: 'LIGHT',
    },
    
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#DC2626',
      sound: 'notification.wav',
    },
    
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    
    Camera: {
      // Camera permissions are handled by the native config
    },
    
    Geolocation: {
      // Location permissions are handled by the native config
    },
  },
  
  // iOS specific configuration
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#FEF2F2',
    preferredContentMode: 'mobile',
  },
  
  // Android specific configuration
  android: {
    backgroundColor: '#FEF2F2',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true, // Set to false for production
  },
};

export default config;

