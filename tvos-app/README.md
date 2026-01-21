# Bayit+ tvOS App

This is the Apple TV (tvOS) version of Bayit+ using react-native-tvos.

## Prerequisites

- Node.js 18+
- CocoaPods
- Xcode 15+ with tvOS SDK
- Apple TV Simulator or device

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Generate tvOS native project

Since react-native-tvos requires a different native project structure, run:

```bash
npx react-native init BayitPlusTVOS --template @AmazonAppDev/react-native-template-tvos@0.76 --pm npm
```

Then copy the generated `tvos/` folder's content (xcodeproj files) to this project's `tvos/` directory.

Alternatively, manually create the Xcode project:
1. Open Xcode
2. Create new project → tvOS → App
3. Name it "BayitPlusTVOS"
4. Save in the `tvos/` directory
5. Configure as React Native project

### 3. Install Pods

```bash
cd tvos
pod install
```

### 4. Run on Apple TV Simulator

```bash
npm run tvos
```

Or from root:

```bash
npm run tvos
```

## Features

- All shared screens from @bayit/shared-screens
- Text-only Watch Party (no WebRTC/LiveKit on tvOS)
- Glassmorphic UI components
- RTL support (Hebrew, English, Spanish)

## Architecture

```
tvos-app/
├── App.tsx                    # Main app entry
├── src/
│   └── components/
│       └── watchparty/        # tvOS-specific text-chat Watch Party
├── tvos/                      # Native Xcode project
│   ├── Podfile
│   ├── BayitPlusTVOS/
│   └── BayitPlusTVOS.xcodeproj/
└── package.json
```

## Shared Code

This app imports from shared packages:
- `@bayit/shared` - UI components
- `@bayit/shared-screens` - All screens
- `@bayit/shared-services` - API services
- `@bayit/shared-stores` - Zustand stores
- `@bayit/shared-hooks` - React hooks
- `@bayit/shared-contexts` - React contexts
- `@bayit/shared-i18n` - Internationalization

## Watch Party (tvOS)

The tvOS version uses text-chat-only Watch Party since WebRTC is not supported on tvOS.
Voice chat is available on mobile devices (Android TV + iOS).
