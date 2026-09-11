# 💕 Kalyanam - Wedding Planning App

**Kalyanam** (కళ్యాణం - meaning "auspicious wedding" in Telugu) is a comprehensive, privacy-focused wedding planning application designed to help families plan and manage weddings across different cultures.

![Kalyanam Banner](docs/images/banner.png)

**Live:** https://omgr.github.io/kalyanam/

---

## 👥 Team

| | |
| --- | --- |
| **Harini Amperayani** | Product Owner · Product Designer · UX Designer · UAT — [harini-amperayani.com](https://harini-amperayani.com) · [@HariniAmperayani](https://github.com/HariniAmperayani) |
| **Madan Gopal Ongole** | Engineering — [@omgr](https://github.com/omgr) |

The original concept for Kalyanam was **Harini's**. She owned the product definition, user
research, personas, information architecture and the complete design system, and validated the
result through usability testing and UAT against a real wedding plan.

📐 **[Design System](docs/DESIGN-SYSTEM.md)** — palette, typography, components, motion, accessibility
🙏 **[Full Credits](CREDITS.md)**

---

## ✨ Features

### 🎉 Event Management
- Pre-built cultural ceremony templates (Telugu Brahmin, South Indian, North Indian, Muslim, Christian)
- Custom event creation with checklists
- Timeline view of all ceremonies
- Status tracking (Scheduled, Ongoing, Completed)

### 👥 Guest Management
- RSVP tracking with multiple statuses
- Plus-ones and dietary restrictions
- Bride/Groom side organization
- Group/table assignments
- Export guest list

### 💰 Budget & Expenses
- Category-wise budget allocation
- **Receipt Scanning** - Capture and attach receipts
- **Payment Installments** - Track staged payments
- Multiple payment methods (Cash, Card, UPI, Bank Transfer, Cheque)
- **Reconciliation** - Match expenses with bank transactions
- Visual budget analytics

### 🏪 Vendor Management
- Contact management for all vendors
- Quoted vs. Final amount tracking
- Payment status monitoring
- Rating system
- Contract and service date tracking

### ✅ Task Management
- Priority-based tasks (Urgent, High, Medium, Low)
- Assign to family members
- Link tasks to events
- Due date reminders

### 👨‍👩‍👧‍👦 Family Collaboration
- Add unlimited family members
- Role-based assignments
- Track responsibilities
- Family-wide communication

### 💬 Messages & Communication
- In-app messaging system
- Announcements for everyone
- Urgent alerts
- Read receipts

### ⏰ Smart Reminders
- Automatic payment reminders
- Task deadline alerts
- Event reminders
- Custom reminder creation

### 📍 Location Tracking
- GPS-based family location
- Zone-based indoor tracking
- Privacy controls
- Real-time updates during events

### 🔄 Sync & Backup (3 Free Methods)
- **Export/Import**: Save and restore JSON backup files
- **QR Code Sync**: Quick device-to-device transfer
- **P2P WebRTC**: Real-time sync over the internet
- All methods are end-to-end private

### 🔒 Privacy First
- **All data stored locally** on your device
- No cloud servers, no accounts required
- Works completely offline
- Direct device-to-device sync (no server)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/kalyanam.git
cd kalyanam

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📱 PWA Installation

Kalyanam is a Progressive Web App (PWA) that can be installed on your device:

### Mobile (Android/iOS)
1. Open Kalyanam in Chrome/Safari
2. Tap "Add to Home Screen" from browser menu
3. Launch from your home screen like a native app

### Desktop (Chrome/Edge)
1. Open Kalyanam in your browser
2. Click the install icon in the address bar
3. Click "Install"

## 🏗️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **Database**: Dexie.js (IndexedDB wrapper)
- **State**: React hooks + Dexie live queries
- **PWA**: next-pwa
- **Language**: TypeScript

## 📁 Project Structure

```
kalyanam/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── budget/             # Budget & expenses
│   │   ├── cultures/           # Cultural template browser
│   │   │   └── [id]/           # Culture detail view
│   │   ├── dashboard/          # Main dashboard
│   │   ├── events/             # Events management (catch-all route)
│   │   │   └── [[...slug]]/    # Handles /events, /events/new, /events/[id], /events/[id]/edit
│   │   ├── explore/            # Feature exploration
│   │   ├── family/             # Family members
│   │   ├── guests/             # Guest management
│   │   ├── location/           # Location tracking
│   │   ├── login/              # Login & session management
│   │   ├── messages/           # Communication
│   │   ├── onboarding/         # Initial setup
│   │   ├── reminders/          # Reminders & alerts
│   │   ├── settings/           # App settings
│   │   ├── sync/               # Sync & backup center
│   │   ├── tasks/              # Task management
│   │   └── vendors/            # Vendor management
│   ├── components/             # Reusable components
│   │   ├── layout/             # Layout components
│   │   ├── providers.tsx       # Context providers
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/
│   │   ├── cultures/           # Cultural templates
│   │   ├── db/                 # Database schema & hooks
│   │   ├── sync/               # Sync utilities (P2P, QR, export)
│   │   └── utils.ts            # Utility functions
│   └── hooks/                  # Custom React hooks
├── android/                    # Capacitor Android project
├── public/
│   ├── icons/                  # PWA icons
│   └── manifest.json           # PWA manifest
├── docs/                       # Documentation
└── ...config files
```

## 🎨 Cultural Templates

### Telugu Brahmin (20+ rituals)
- Nischitartham, Muhurtham, Saptapadi, Talambralu...

### North Indian Hindu
- Mehendi, Sangeet, Baraat, Fera...

### South Indian Hindu  
- Nischayathartham, Nalungu, Muhurtham...

### Muslim
- Istikhara, Mehndi, Nikah, Walima...

### Christian
- Engagement, Rehearsal Dinner, Wedding Ceremony, Reception...

### Custom
Create your own ceremonies and traditions!

## 📱 Mobile App (Android/iOS)

Kalyanam can be built as a native mobile app using Capacitor:

```bash
# Build web assets
npm run build

# Sync with Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android
```

See [Mobile Build Guide](docs/mobile-build.md) for detailed instructions.

## 📖 Documentation

- [User Guide](docs/user-guide.md) - Complete feature documentation
- [Setup Guide](docs/setup.md) - Development environment setup
- [Deployment Guide](docs/deployment.md) - Production deployment
- [Testing Guide](docs/testing.md) - Testing procedures
- [Mobile Build Guide](docs/mobile-build.md) - Android/iOS build instructions
- [Sync Guide](docs/sync-guide.md) - Data sync between devices

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for beautiful components
- [Dexie.js](https://dexie.org/) for IndexedDB management
- [Lucide Icons](https://lucide.dev/) for icons
- [Framer Motion](https://www.framer.com/motion/) for animations

---

<p align="center">
  Made with ❤️ for beautiful beginnings
</p>
