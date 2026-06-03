# Sync & Backup Guide

Kalyanam offers three free, privacy-focused methods to sync and backup your wedding data across devices. All methods keep your data private - nothing is stored on any external server.

## Overview

| Method | Best For | Requires | Privacy |
|--------|----------|----------|---------|
| **Export/Import** | Backups, email transfer | File sharing | ✅✅✅ |
| **QR Code Sync** | Quick device-to-device | Camera | ✅✅✅ |
| **P2P Real-time** | Same-time sync | Both devices online | ✅✅✅ |

---

## Method 1: Export/Import File

### Best For
- Creating backups
- Transferring via email or cloud storage
- Archiving completed weddings

### How to Export

1. Open Kalyanam
2. Go to **Sync & Backup** from the sidebar
3. Click **Export Data**
4. Choose **Export as JSON**
5. A file will download (e.g., `priya_rahul_wedding_2025-01-19.kalyanam.json`)

### How to Import

1. On the target device, open Kalyanam
2. Go to **Sync & Backup**
3. Click **Import Data**
4. Select the `.kalyanam.json` file
5. The wedding will be imported as a new entry

### What's Included

The export includes ALL wedding data:
- Wedding details
- Events & ceremonies
- Guest list with RSVP status
- Tasks & assignments
- Budget & expenses
- Vendor information
- Messages & reminders
- Family members

### File Format

```json
{
  "version": "1.0.0",
  "exportedAt": "2025-01-19T10:30:00.000Z",
  "weddingId": "abc-123",
  "data": {
    "wedding": { ... },
    "events": [ ... ],
    "guests": [ ... ],
    // ... all data
  }
}
```

---

## Method 2: QR Code Sync

### Best For
- Quick sync between two devices in person
- When you don't want to type codes
- Sharing with family members nearby

### How to Share via QR

**On Device A (sharing):**
1. Go to **Sync & Backup**
2. Click **Show QR Code**
3. A QR code and 6-character code will appear
4. Click **Start Sharing** to begin hosting

**On Device B (receiving):**
1. Go to **Sync & Backup**
2. Click **Scan QR Code**
3. Point camera at the QR code
4. Or enter the 6-character code manually
5. Wait for data transfer

### QR Code Details

- QR codes are valid for **5 minutes**
- Each code is unique and one-time use
- Generate a new code anytime by clicking "Generate New Code"

### Tips

- Ensure good lighting for camera scanning
- Hold the camera steady about 6-12 inches from the QR code
- If scanning fails, use manual code entry

---

## Method 3: P2P Real-time Sync

### Best For
- Syncing when both people have the app open
- Remote sync over the internet
- When you can coordinate timing

### ⚠️ Important: Both Devices Must Be Online

P2P sync requires **both devices to be online simultaneously** with the app open:

- The sharing device generates a code and **must stay online waiting**
- The receiving device enters the code to connect
- If the sharing device closes the app or goes offline, the connection will fail
- This is because data transfers directly between devices - there's no server in the middle

### How P2P Works

```
Device A (Host)                    Device B (Guest)
     │                                  │
     │  1. Generate sync code           │
     │  ──────────────────────────►     │
     │                                  │
     │  2. Enter code                   │
     │  ◄──────────────────────────     │
     │                                  │
     │  3. WebRTC connection            │
     │  ◄─────────────────────────►     │
     │                                  │
     │  4. Direct data transfer         │
     │  ═════════════════════════►      │
     │                                  │
```

### Step-by-Step

**On Device A (Host):**
1. Go to **Sync & Backup**
2. Click **Share from Here**
3. Note the 6-character code (e.g., `ABC123`)
4. Share this code with Device B user
5. Wait for connection

**On Device B (Guest):**
1. Go to **Sync & Backup**
2. Click **Receive Data**
3. Enter the 6-character code
4. Click **Connect**
5. Wait for data transfer

### Connection States

| Status | Meaning |
|--------|---------|
| 🔵 Connecting | Establishing connection |
| 🟢 Connected | Ready to transfer |
| 🔴 Failed | Connection couldn't be established |

### Troubleshooting P2P

**Connection Fails?**
- Ensure both devices have internet
- Check if firewalls are blocking WebRTC
- Try generating a new code
- Move to a better network

**Transfer Slow?**
- Large weddings take longer
- Images/receipts increase transfer time
- WiFi is faster than cellular

---

## Security & Privacy

### End-to-End Privacy

All sync methods are designed with privacy first:

1. **Export/Import**: File never leaves your control
2. **QR Code**: Connection info is temporary
3. **P2P**: Direct device-to-device, no server

### What We DON'T Do

- ❌ Store your data on our servers
- ❌ Require account creation
- ❌ Track sync activity
- ❌ Access your wedding information

### Encryption

When data is transferred:
- P2P uses WebRTC's built-in encryption
- Signaling uses short-lived, random codes
- No persistent connection info is stored

---

## Login Page Sync (New Devices)

When opening Kalyanam on a new device for the first time, you can sync directly from the login page:

### Option 1: Sync Code Entry

Best for desktop/laptop browsers where QR scanning is impractical:

1. Click **"Login / Sync"** on the landing page
2. Select **"Enter Sync Code"**
3. **On your source device**, go to Sync & Backup → "Share from Here"
4. **Keep the source device app open** - it must stay online
5. Enter the 6-character code shown on the source device
6. Click **"Connect & Sync"**
7. Your wedding data transfers directly

⚠️ **Remember**: Both devices must be online at the same time. If dad generates a code in India and closes his laptop, you won't be able to connect from the UK.

### Option 2: Import File (Works Anytime)

Best for email/cloud transfers when you can't coordinate timing:

1. Click **"Login / Sync"** on the landing page
2. Select **"Import Backup File"**
3. Select your `.kalyanam.json` file
4. Your wedding is imported automatically

**Advantage**: No need for both devices to be online at the same time. Just export on one device, send the file, and import on the other.

---

## Family Room (Continuous Sync)

Family Room is designed for ongoing collaboration where multiple family members need to stay in sync.

### How It Works

1. **Initial Pairing**: First time requires both devices online (same as P2P sync)
2. **Device Memory**: After pairing, devices remember each other
3. **Auto-Reconnect**: When both devices open the app later, they automatically try to reconnect
4. **Real-time Sync**: While connected, changes sync immediately to all devices

### Setting Up Family Room

1. Go to **Sync & Backup** → **Family Room**
2. One person clicks "Create Room" and shares the code
3. Others click "Join Room" and enter the code
4. **Both devices must have the app open during this initial pairing**

### After Pairing

- Devices will try to auto-connect when the app opens
- If the other person isn't online, your changes are queued
- When both are online, changes sync automatically

### Limitations

- Still requires both devices online for sync to happen
- No server means no "offline to online" push notifications
- For guaranteed transfer, use Export/Import method

---

## Sync Scenarios

### Scenario 1: Share with Spouse

You want to give your spouse access to the wedding planning:

1. Both install Kalyanam
2. You: Show QR Code
3. Spouse: Scan QR Code
4. Both now have the same data

### Scenario 2: Backup to New Phone

You got a new phone and want to transfer data:

1. Old phone: Export to JSON file
2. Transfer file (AirDrop, email, cloud)
3. New phone: Import the JSON file

### Scenario 3: Family Collaboration

Multiple family members need access:

1. Export data to JSON
2. Share file via WhatsApp/email
3. Each person imports the file
4. Everyone has the same starting point

### Scenario 4: Backup Before Wedding

Create a backup before the big day:

1. Export to JSON (keep safe!)
2. After wedding, you have complete records
3. Can import to any device later

---

## Comparison Table

| Feature | Export/Import | QR Code | P2P |
|---------|--------------|---------|-----|
| Internet Required | ❌ (for export) | ✅ | ✅ |
| Devices Together | ❌ | ✅ | ❌ |
| File Involved | ✅ | ❌ | ❌ |
| Best Distance | Any | Close | Any |
| Speed | Varies | Fast | Fast |
| Complexity | Easy | Easy | Medium |

---

## Frequently Asked Questions

### Q: Can I sync automatically?

Currently, syncing is manual. This ensures your privacy - no background data transfers.

### Q: What if data conflicts?

Imports create new weddings to avoid conflicts. You can delete duplicates manually.

### Q: Is my data encrypted?

P2P transfers use WebRTC encryption. Exported files are plain JSON (readable) - keep them secure.

### Q: Can I sync with family in another country?

Yes! P2P sync works over the internet. Share the 6-character code via text/call.

### Q: What about smartwatch sync?

Coming soon! Native mobile app will support watch notifications.

### Q: How large can exports be?

Exports include all data including receipt images. Large weddings might be 10-50MB.

---

## Tips for Success

1. **Regular Backups**: Export before major changes
2. **Test First**: Do a test sync before the wedding
3. **Keep Codes Private**: Sync codes grant full access
4. **Same Version**: Use same app version on both devices
5. **Good Connection**: Use WiFi for large transfers

---

## Need Help?

If you encounter issues:
1. Check your internet connection
2. Refresh and try again
3. Generate a new sync code
4. Use export/import as fallback

For technical issues, check the [GitHub repository](https://github.com/yourusername/kalyanam).

