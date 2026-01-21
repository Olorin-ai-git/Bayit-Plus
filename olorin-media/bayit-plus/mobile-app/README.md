# Bayit+ iOS Mobile App

A voice-first iOS mobile app for Israeli content streaming with Picture-in-Picture widgets, built with React Native.

## Features

- 📱 **Native iOS App** for iPhone and iPad
- 🎯 **Picture-in-Picture Widgets** with touch gestures
- 🎤 **Voice-First Interface** with wake word detection ("Hey Bayit")
- 🗣️ **Multi-language Voice Commands** (Hebrew, English, Spanish)
- 📺 **Live TV**, VOD, Radio, Podcasts
- 🏠 **Home Screen Widgets** (WidgetKit)
- 🎭 **SharePlay** for synchronized viewing
- 🚗 **CarPlay** support for audio content
- 🌐 **Hebrew RTL Support**
- 🎨 **Glass Morphism Design**

## Architecture

- **80%+ Code Reuse** from existing monorepo (`/shared/`)
- **React Native 0.76.5** with TypeScript
- **React Navigation** for navigation
- **Zustand** for state management
- **NativeWind** for styling
- **i18next** for internationalization

## Prerequisites

- **macOS** (for iOS development)
- **Node.js** >= 20.0.0
- **npm** or **yarn**
- **Xcode** 15+ (with iOS 16+ SDK)
- **CocoaPods** (for iOS dependencies)
- **Ruby** (for CocoaPods)

## Installation

### 1. Install Dependencies

```bash
cd mobile-app
npm install
```

### 2. Install iOS Dependencies

```bash
cd ios
pod install
cd ..
```

### 3. Run on iOS Simulator

```bash
npm run ios
```

Or open `ios/BayitPlus.xcworkspace` in Xcode and run from there.

### 4. Run on Physical Device

```bash
npm run ios:device
```

## Project Structure

```
mobile-app/
├── ios/                    # iOS native code
│   └── BayitPlus/
│       ├── Info.plist      # iOS configuration
│       └── ...
├── src/
│   ├── components/         # Mobile-specific components
│   │   ├── navigation/     # TabBar
│   │   ├── voice/          # VoiceCommandButton
│   │   ├── widgets/        # PiP widgets (TODO)
│   │   └── ...
│   ├── navigation/         # Navigation setup
│   │   ├── RootNavigator.tsx
│   │   ├── MainTabNavigator.tsx
│   │   └── types.ts
│   ├── screens/            # Mobile-specific screens
│   ├── hooks/              # Mobile-specific hooks
│   ├── services/           # Native bridges
│   ├── stores/             # Mobile-specific stores
│   └── config/             # App configuration
├── App.tsx                 # App entry point
├── index.js                # React Native entry
├── metro.config.js         # Metro bundler config
├── tsconfig.json           # TypeScript config
├── tailwind.config.js      # NativeWind config
└── package.json

Shared from /shared/:
- components/               # 21+ glass UI components
- screens/                  # 26+ reusable screens
- hooks/                    # 17 hooks (voice, device, etc.)
- services/                 # API, voice, AI services
- stores/                   # Zustand stores
- i18n/                     # Hebrew, English, Spanish
```

## Development

### Start Metro Bundler

```bash
npm start
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Testing

```bash
npm test
```

## Configuration

### App Mode (Demo vs Production)

Set `APP_MODE` environment variable:

```bash
# Demo mode (uses mock data)
export APP_MODE=demo
npm run ios

# Production mode (uses real API)
export APP_MODE=production
npm run ios
```

### API Endpoint

Configure in `/shared/services/api.ts`:
- Development: `http://localhost:8000/api/v1`
- Production: `https://api.bayit.tv/api/v1`

## Voice Commands

### Wake Words
- Hebrew: "היי בית" (Hey Bayit)
- English: "Hey Bayit"
- Spanish: "Oye Bayit"

### Example Commands
- "Go to home"
- "Show live TV"
- "Play Channel 13"
- "Search for comedy"
- "Open Channel 12 widget"
- "Mute widget"
- "Switch to Hebrew"
- "When is Shabbat?"

## Implementation Status

### ✅ Phase 1: Foundation (Complete)
- ✓ React Native project setup with Metro config
- ✓ Navigation system (Stack + Tabs)
- ✓ Shared component integration (80%+ code reuse)
- ✓ RTL support (Hebrew)
- ✓ Custom glass tab bar
- ✓ Floating voice button
- ✓ iOS Info.plist configuration

### ✅ Phase 2: PiP Widgets + Voice Integration (Complete)
- ✓ PiPWidgetContainer with touch gestures (pan, pinch, double tap)
- ✓ PiPWidgetManager orchestrator
- ✓ pipWidgetStore (Zustand + AsyncStorage)
- ✓ MobileVideoPlayer (HLS, native PiP)
- ✓ MobileAudioPlayer (background audio)
- ✓ VoiceWaveform visual feedback
- ✓ iOS Speech framework bridge (SpeechModule.swift)
- ✓ useVoiceMobile hook
- ✓ Voice command processor integration
- ✓ Voice-controlled widgets

**See [PHASE2_COMPLETE.md](./PHASE2_COMPLETE.md) for full details**

### ✅ Phase 3: Advanced Voice Features + Home Widgets (Complete)
- ✓ Wake word detection (WakeWordModule.swift) - "Hey Bayit" in 3 languages
- ✓ TTS integration (TTSModule.swift + AVSpeechSynthesizer)
- ✓ VoiceOnboarding screen with 4-step wizard
- ✓ Home Screen Widgets (WidgetKit extension)
- ✓ Deep linking infrastructure (bayitplus:// URL scheme)
- ✓ WidgetKit data bridge (App Groups)
- ✓ Widget timeline management

**See [PHASE3_COMPLETE.md](./PHASE3_COMPLETE.md) for full details**

### Phase 4: Proactive AI + iOS Features (Next)
- [ ] Home Screen Widgets (WidgetKit)

### Phase 4: Proactive AI + iOS Features
- [ ] Proactive voice suggestions
- [ ] Siri Shortcuts (SiriKit)
- [ ] CarPlay integration
- [ ] Emotional intelligence

### Phase 5: SharePlay
- [ ] SharePlay synchronized viewing
- [ ] Watch party integration

### Phase 6: Polish & Optimization
- [ ] Hebrew voice testing
- [ ] Battery optimization
- [ ] Performance tuning
- [ ] Accessibility (VoiceOver, Dynamic Type)

### Phase 7: App Store Submission
- [ ] App Store assets
- [ ] Privacy policy
- [ ] Submit for review

## Troubleshooting

### Metro Bundler Issues

```bash
# Clear Metro cache
npm start -- --reset-cache
```

### iOS Build Issues

```bash
# Clean build
cd ios
xcodebuild clean
pod deintegrate
pod install
cd ..
```

### Shared Package Resolution Issues

Make sure `/shared/` directory exists and contains all components. Check `metro.config.js` watchFolders and extraNodeModules.

## Resources

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [React Navigation](https://reactnavigation.org/)
- [NativeWind](https://www.nativewind.dev/)
- [iOS Speech Framework](https://developer.apple.com/documentation/speech)
- [WidgetKit](https://developer.apple.com/documentation/widgetkit)
- [SiriKit](https://developer.apple.com/documentation/sirikit)
- [SharePlay](https://developer.apple.com/documentation/groupactivities)

## License

Proprietary - Bayit+

## Support

For questions or issues, contact the development team.
