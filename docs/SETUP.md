# 🛠️ Setup Guide

This guide will help you set up the Kalyanam development environment.

## Prerequisites

### Required Software

1. **Node.js** (v18.17.0 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify: `node --version`

2. **npm** (comes with Node.js) or **yarn**
   - Verify: `npm --version`

3. **Git** (for version control)
   - Download from [git-scm.com](https://git-scm.com/)

### Recommended IDE

- [Visual Studio Code](https://code.visualstudio.com/)
- Recommended extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features

## Installation Steps

### 1. Clone/Navigate to Project

```bash
cd kalyanam
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Setup (Optional)

Create a `.env.local` file in the root directory:

```env
# App Configuration
NEXT_PUBLIC_APP_NAME="Kalyanam"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional: Google Maps API (for enhanced location features)
# NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_api_key_here
```

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Project Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate test coverage report |

## Folder Structure Overview

```
kalyanam/
├── src/
│   ├── app/              # Next.js 14 App Router
│   ├── components/       # React components
│   ├── lib/              # Libraries and utilities
│   │   ├── db/           # Database (Dexie.js)
│   │   └── cultures/     # Cultural templates
│   └── hooks/            # Custom React hooks
├── public/               # Static assets
├── docs/                 # Documentation
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript config
```

## Troubleshooting

### Common Issues

#### 1. Node Version Error
```
Error: The engine "node" is incompatible
```
**Solution**: Update Node.js to v18.17.0 or higher

#### 2. Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution**: Kill the process using port 3000 or use a different port:
```bash
npm run dev -- -p 3001
```

#### 3. Module Not Found
```
Error: Cannot find module 'xyz'
```
**Solution**: Delete `node_modules` and reinstall:
```bash
rm -rf node_modules
npm install
```

#### 4. TypeScript Errors
```
Type errors in VS Code
```
**Solution**: Restart TypeScript server:
- VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

### Getting Help

If you encounter issues not covered here:
1. Check the error message carefully
2. Search for the error in the project issues
3. Create a new issue with:
   - Error message
   - Steps to reproduce
   - Your environment (Node version, OS, etc.)

## Next Steps

After setup, you can:
1. Read the [Development Guide](./DEVELOPMENT.md)
2. Explore the [User Guide](./USER_GUIDE.md)
3. Learn about [Deployment](./DEPLOYMENT.md)

