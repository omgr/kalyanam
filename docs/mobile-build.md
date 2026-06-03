# Mobile App Build Guide

This guide explains how to build Kalyanam as a native mobile app for Android and iOS.

## Architecture Overview

Kalyanam uses **Capacitor** to wrap the Next.js web app into native mobile containers:

```
┌─────────────────────────────────────────┐
│            Kalyanam App                  │
├─────────────────────────────────────────┤
│  Next.js Web App (React + TypeScript)   │
├─────────────────────────────────────────┤
│           Capacitor Bridge               │
├─────────────────────────────────────────┤
│  Native Container (Android/iOS)          │
│  - Camera access                         │
│  - GPS/Location                          │
│  - Push Notifications                    │
│  - Haptic Feedback                       │
│  - File System                           │
└─────────────────────────────────────────┘
```

### How IndexedDB Works on Mobile

1. **Same Storage**: IndexedDB works identically in the Capacitor WebView
2. **Persistent**: Data survives app updates and restarts
3. **Per-App**: Each app has isolated storage
4. **No Sync by Default**: Data stays on the device (privacy-first)

## Prerequisites

### For Android Development
- **JDK 17+**: Java Development Kit
- **Android Studio**: [Download](https://developer.android.com/studio)
- **Android SDK**: API Level 22+ (Android 5.1+)

### For iOS Development (Mac only)
- **Xcode 15+**: [Download from App Store](https://apps.apple.com/app/xcode/id497799835)
- **CocoaPods**: `sudo gem install cocoapods`
- **Apple Developer Account**: For distribution

### Node.js
- Node.js 18+ (already required for the web app)

## Setup

### 1. Install Dependencies

```bash
cd kalyanam
npm install
```

### 2. Initialize Capacitor (First time only)

```bash
# Add Android platform
npm run cap:add:android

# Add iOS platform (Mac only)
npm run cap:add:ios
```

This creates:
- `android/` folder with Android project
- `ios/` folder with iOS project

### 3. Configure App Icons & Splash Screens

#### Android
Place icons in `android/app/src/main/res/`:
- `mipmap-mdpi/ic_launcher.png` (48x48)
- `mipmap-hdpi/ic_launcher.png` (72x72)
- `mipmap-xhdpi/ic_launcher.png` (96x96)
- `mipmap-xxhdpi/ic_launcher.png` (144x144)
- `mipmap-xxxhdpi/ic_launcher.png` (192x192)

#### iOS
Use Xcode's Asset Catalog to add icons.

## Building the App

### Android Debug Build (APK)

```bash
# Step by step build:

# 1. Set environment variable for mobile build (Windows PowerShell)
$env:MOBILE_BUILD='true'

# Or on Mac/Linux:
export MOBILE_BUILD=true

# 2. Build the web app (creates static export in 'out' folder)
npm run build

# 3. Sync with Capacitor (copies web assets to Android project)
npx cap sync android

# 4. Open in Android Studio
npx cap open android
```

**Note**: The `MOBILE_BUILD=true` environment variable triggers static export mode in Next.js, which is required for Capacitor.

In Android Studio:
1. Wait for Gradle sync
2. Click **Build > Build Bundle(s) / APK(s) > Build APK(s)**
3. APK will be in `android/app/build/outputs/apk/debug/`

### Android Release Build (Signed APK)

1. **Generate Keystore** (first time):
```bash
keytool -genkey -v -keystore kalyanam-release.keystore -alias kalyanam -keyalg RSA -keysize 2048 -validity 10000
```

2. **Configure signing** in `android/app/build.gradle`:
```groovy
android {
    signingConfigs {
        release {
            storeFile file('kalyanam-release.keystore')
            storePassword 'your-password'
            keyAlias 'kalyanam'
            keyPassword 'your-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

3. **Build release APK**:
```bash
cd android
./gradlew assembleRelease
```

APK: `android/app/build/outputs/apk/release/app-release.apk`

### Android App Bundle (AAB) for Play Store

```bash
cd android
./gradlew bundleRelease
```

AAB: `android/app/build/outputs/bundle/release/app-release.aab`

### iOS Build (Mac only)

```bash
npm run mobile:build
npx cap open ios
```

In Xcode:
1. Select your development team
2. Set bundle identifier: `com.kalyanam.app`
3. Select target device or "Any iOS Device"
4. **Product > Archive** for distribution
5. **Distribute App** to App Store or export IPA

## Testing

### Android Emulator

1. Open Android Studio
2. **Tools > Device Manager**
3. Create a virtual device (Pixel 6, API 33 recommended)
4. Run the app: green play button

### iOS Simulator (Mac only)

1. Open Xcode
2. Select a simulator (iPhone 15 Pro)
3. Press play button or `Cmd + R`

### Physical Device

#### Android
1. Enable **Developer Options** on your phone
2. Enable **USB Debugging**
3. Connect via USB
4. Run from Android Studio

#### iOS
1. Connect iPhone to Mac
2. Trust the computer on your iPhone
3. Select your device in Xcode
4. Run (may need to trust the developer in Settings)

## Distribution

### Android

#### Google Play Store
1. Create [Google Play Console](https://play.google.com/console) account ($25 one-time)
2. Create new app
3. Upload AAB file
4. Fill store listing, content rating, pricing
5. Submit for review

#### Direct APK
Share the APK file directly. Users must enable "Install from unknown sources".

### iOS

#### App Store
1. [Apple Developer Program](https://developer.apple.com/programs/) ($99/year)
2. Create app in [App Store Connect](https://appstoreconnect.apple.com)
3. Archive in Xcode and upload
4. Submit for review

#### TestFlight (Beta)
1. Upload to App Store Connect
2. Add testers (up to 10,000 external testers)
3. Testers install via TestFlight app

## Native Features

### Camera (Receipt Scanning)

```typescript
import { takePhoto, pickFromGallery } from '@/lib/capacitor';

// Take a photo
const photo = await takePhoto();

// Pick from gallery
const image = await pickFromGallery();
```

### Location (Family Tracking)

```typescript
import { getCurrentLocation } from '@/lib/capacitor';

const location = await getCurrentLocation();
// { latitude: 17.385, longitude: 78.486, accuracy: 10 }
```

### Notifications (Reminders)

```typescript
import { scheduleNotification } from '@/lib/capacitor';

await scheduleNotification({
  id: 1,
  title: 'Payment Due',
  body: 'Photographer balance payment is due tomorrow',
  schedule: new Date('2025-02-14T09:00:00'),
});
```

### Haptic Feedback

```typescript
import { hapticFeedback } from '@/lib/capacitor';

// On button press
await hapticFeedback('medium');
```

## Troubleshooting

### Build Fails

```bash
# Clean and rebuild
cd android && ./gradlew clean
npm run mobile:build
```

### WebView Issues

Check `capacitor.config.ts`:
```typescript
android: {
  webContentsDebuggingEnabled: true, // Enable for debugging
}
```

### "App not installed" on Android

- Check minimum SDK version
- Ensure APK is signed
- Check for conflicting app with same package name

### iOS Signing Issues

1. Open Xcode preferences
2. Add Apple ID account
3. Automatically manage signing
4. Select development team

## Data Flow

```
┌─────────────┐
│   User      │
└─────┬───────┘
      │ Interact
      ▼
┌─────────────┐
│  React UI   │
└─────┬───────┘
      │ Read/Write
      ▼
┌─────────────┐
│  Dexie.js   │
└─────┬───────┘
      │ Store
      ▼
┌─────────────────────────────────┐
│  IndexedDB (WebView Storage)    │
│  - Persistent across sessions   │
│  - Private to app               │
│  - No cloud sync (by design)    │
└─────────────────────────────────┘
```

## Data Sync

Kalyanam supports multiple sync methods - all privacy-focused with no cloud servers:

### Available Sync Methods

1. **Export/Import JSON** - Manual file-based backup and transfer
2. **QR Code Sync** - Quick device-to-device transfer (requires both devices present)
3. **P2P WebRTC Sync** - Real-time sync over the internet (both devices must be online)
4. **Family Room** - Persistent pairing for continuous sync when both devices are online

### How Mobile Sync Works

On mobile (Capacitor app):
- IndexedDB works identically to web - data is stored in the WebView
- All sync methods work the same as on web
- P2P codes can be entered manually (QR scanning also works on mobile)

### Recommended Sync Flow

1. **First sync**: Export from web → Import on mobile (or vice versa)
2. **Ongoing**: Use Family Room for automatic sync when both devices are online
3. **Backup**: Periodically export JSON as backup

See [Sync Guide](sync-guide.md) for detailed instructions.

---

## Quick Reference

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Build web | `npm run build` |
| Build mobile | `npm run mobile:build` |
| Open Android | `npx cap open android` |
| Open iOS | `npx cap open ios` |
| Sync changes | `npx cap sync` |

---

Need help? Check [Capacitor docs](https://capacitorjs.com/docs) or create an issue.

