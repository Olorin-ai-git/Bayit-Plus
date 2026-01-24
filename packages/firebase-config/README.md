# @bayit/firebase-config

**Shared Firebase Configuration for Bayit+ Ecosystem**

This package provides centralized Firebase configuration management across all Bayit+ platforms (web, mobile-app, partner-portal), preventing configuration duplication and ensuring consistent security practices.

## 🎯 Purpose

- **Single Source of Truth**: All platforms use the same configuration logic
- **Security Enforcement**: Fail-fast validation, no hardcoded values, no fallbacks
- **Platform Agnostic**: Supports Vite (web), React Native (mobile), Next.js (partner)
- **Type Safety**: Full TypeScript support with validated configuration
- **Prevent Duplication**: Eliminates copy-pasted Firebase config across platforms

## 📦 Installation

This is an internal workspace package. Add to your platform's `package.json`:

```json
{
  "dependencies": {
    "@bayit/firebase-config": "workspace:*"
  }
}
```

Then run:

```bash
npm install
```

## 🚀 Usage

### Web Platform (Vite)

**File:** `web/src/config/firebase.ts`

```typescript
import { getFirebaseConfig } from '@bayit/firebase-config';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Get validated configuration
const firebaseConfig = getFirebaseConfig();

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
```

**Environment Variables** (`.env`):

```bash
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=bayit-plus.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=bayit-plus
VITE_FIREBASE_STORAGE_BUCKET=bayit-plus.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Mobile Platform (React Native)

**File:** `mobile-app/src/config/firebase.ts`

```typescript
import { getFirebaseConfig } from '@bayit/firebase-config';
import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);

// Mobile-specific: Use AsyncStorage for persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export default app;
```

**Environment Variables** (`.env`):

```bash
FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
FIREBASE_AUTH_DOMAIN=bayit-plus.firebaseapp.com
FIREBASE_PROJECT_ID=bayit-plus
FIREBASE_STORAGE_BUCKET=bayit-plus.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:ios:abcdef1234567890
FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Partner Portal (Next.js)

**File:** `partner-portal/src/lib/firebase.ts`

```typescript
import { getFirebaseConfig } from '@bayit/firebase-config';
import { initializeApp, getApps } from 'firebase/app';

// Prevent re-initialization in Next.js
if (!getApps().length) {
  const firebaseConfig = getFirebaseConfig();
  initializeApp(firebaseConfig);
}

export const app = getApps()[0];
```

**Environment Variables** (`.env.local`):

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=bayit-plus.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=bayit-plus
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=bayit-plus.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 🔐 Security Features

### Fail-Fast Validation

The configuration **fails immediately** if any required field is missing:

```typescript
// ❌ Missing VITE_FIREBASE_API_KEY
// Result: Clear error message, app DOES NOT START

// ✅ All variables set
// Result: Configuration validated, app continues
```

### No Hardcoded Values

```typescript
// ❌ FORBIDDEN - Hardcoded config
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "bayit-plus.firebaseapp.com",
  // ...
};

// ✅ CORRECT - Environment-based config
import { getFirebaseConfig } from '@bayit/firebase-config';
const firebaseConfig = getFirebaseConfig();
```

### Format Validation

- **API Key**: Alphanumeric with hyphens/underscores
- **Project ID**: Lowercase alphanumeric with hyphens
- **Auth Domain**: Valid domain name (must contain `.`)

### No Fallback Values

If a required variable is missing, the app **refuses to start** with a clear error message. There are NO silent fallbacks to default values.

## 🧪 Testing

For testing purposes, you can override specific configuration values:

```typescript
import { getFirebaseConfigWithOverrides } from '@bayit/firebase-config';

// In tests only
const testConfig = getFirebaseConfigWithOverrides({
  projectId: 'bayit-plus-test',
  apiKey: 'test-api-key-123'
});
```

**NEVER use overrides in production code.**

## 📋 Environment Variable Matrix

| Platform | Prefix | Example |
|----------|--------|---------|
| **Web (Vite)** | `VITE_FIREBASE_` | `VITE_FIREBASE_API_KEY` |
| **Mobile (RN)** | `FIREBASE_` | `FIREBASE_API_KEY` |
| **Partner (Next)** | `NEXT_PUBLIC_FIREBASE_` | `NEXT_PUBLIC_FIREBASE_API_KEY` |

All platforms support the same Firebase configuration fields:

| Field | Required | Description |
|-------|----------|-------------|
| `API_KEY` | ✅ Yes | Firebase Web API Key |
| `AUTH_DOMAIN` | ✅ Yes | Firebase Auth domain |
| `PROJECT_ID` | ✅ Yes | Firebase project ID |
| `STORAGE_BUCKET` | ✅ Yes | Cloud Storage bucket |
| `MESSAGING_SENDER_ID` | ✅ Yes | Cloud Messaging sender ID |
| `APP_ID` | ✅ Yes | Firebase app ID |
| `MEASUREMENT_ID` | ❌ No | Google Analytics ID (optional) |

## 🔨 Development

### Build the Package

```bash
cd packages/firebase-config
npm run build
```

This generates TypeScript declarations in `dist/`:

```
dist/
├── index.js
├── index.d.ts
├── config.js
└── config.d.ts
```

### Watch Mode (Development)

```bash
npm run dev
```

### Clean Build Artifacts

```bash
npm run clean
```

## 📂 Project Structure

```
packages/firebase-config/
├── package.json          # Package configuration
├── tsconfig.json         # TypeScript configuration
├── README.md             # This file
├── src/
│   ├── index.ts          # Public exports
│   └── config.ts         # Configuration logic
└── dist/                 # Build output (generated)
    ├── index.js
    ├── index.d.ts
    ├── config.js
    └── config.d.ts
```

## 🚨 Error Messages

When configuration is invalid, you'll see clear error messages:

### Missing Configuration

```
🔥 FIREBASE CONFIGURATION ERROR

Missing required Firebase configuration fields:
  ❌ apiKey
  ❌ projectId

Set these environment variables:

Web (Vite):
  VITE_FIREBASE_API_KEY=...
  VITE_FIREBASE_PROJECT_ID=...

Mobile (React Native):
  FIREBASE_API_KEY=...
  FIREBASE_PROJECT_ID=...

Partner Portal (Next.js):
  NEXT_PUBLIC_FIREBASE_API_KEY=...
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=...

See: packages/firebase-config/README.md for details
```

### Invalid Format

```
Invalid Firebase project ID format: "BAYIT_PLUS_123".
Expected lowercase alphanumeric string with hyphens.
```

## 🔗 Related Documentation

- [Firebase Setup Guide](../../docs/firebase/SETUP.md)
- [Environment Variables Guide](../../docs/deployment/ENVIRONMENT_VARIABLES.md)
- [Security Best Practices](../../docs/security/CONFIGURATION.md)

## 📝 Migration Guide

### Before (Duplicated Config)

**web/src/config/firebase.ts:**
```typescript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "bayit-plus.firebaseapp.com",
  // ... hardcoded values
};
```

**mobile-app/src/config/firebase.ts:**
```typescript
const firebaseConfig = {
  apiKey: "AIzaSy...", // Same values duplicated
  authDomain: "bayit-plus.firebaseapp.com",
  // ...
};
```

### After (Shared Package)

**All platforms:**
```typescript
import { getFirebaseConfig } from '@bayit/firebase-config';
const firebaseConfig = getFirebaseConfig(); // Single source of truth
```

## ✅ Benefits

- **No Duplication**: Configuration logic exists in one place
- **Consistent Security**: All platforms enforce same validation rules
- **Easy Updates**: Change configuration pattern once, affects all platforms
- **Type Safety**: TypeScript ensures correct usage
- **Clear Errors**: Fail-fast with actionable error messages
- **Platform Agnostic**: Works with Vite, React Native, Next.js, etc.

## 📞 Support

For issues or questions:
- See [Firebase Documentation](https://firebase.google.com/docs)
- Check [Internal Wiki](../../docs/README.md)
- Contact DevSecOps Team

---

**Version:** 1.0.0
**Last Updated:** 2026-01-23
**Maintained By:** Bayit+ Platform Team
