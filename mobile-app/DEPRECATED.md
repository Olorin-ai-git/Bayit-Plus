# ⚠️ DEPRECATED - React Native Mobile App

**Status:** Deprecated as of February 14, 2026
**Reason:** Migrated to native Swift iOS app
**Replacement:** `/ios-app/` (Native Swift iOS application)

## Migration Summary

This React Native mobile app has been **fully deprecated** and replaced by the native Swift iOS application located in `/ios-app/`.

### Why We Migrated

1. **Superior Performance** - Native Swift provides better performance and memory management
2. **78 Missing Features** - React Native app had only 18 features vs. 96 in native iOS
3. **Better iOS Integration** - Full access to iOS frameworks and capabilities
4. **Maintenance Burden** - Supporting two codebases (RN + Swift) was inefficient

### What Was Migrated

All critical functionality has been migrated to native Swift:

#### ✅ Phase 1: Firebase Crashlytics
- Native Swift implementation
- Enhanced error tracking with full context
- User identification and custom values

#### ✅ Phase 2: Firebase Cloud Messaging (Push Notifications)
- Complete BayitNotifications package
- 14 topic-based subscriptions
- Interactive notification actions
- Native APNs integration

#### ✅ Phase 3: Google Cast SDK (Chromecast)
- Complete BayitCast package
- Protocol-based architecture
- SwiftUI cast button component
- MediaPlayer integration bridge

### Features Native iOS Has (That React Native Didn't)

1. **Interactive Subtitles** - AI-powered learning modes (Shoresh, Engrew, GrammarFlip)
2. **Live Dubbing** - Real-time audio translation with voice selection
3. **Trivia Overlay** - Facts during playback with leaderboard
4. **3D Avatars** - ARKit-powered avatar creation
5. **Widgets** - Home screen and Lock Screen widgets
6. **Live Activities** - Dynamic Island integration
7. **SharePlay** - Watch together over FaceTime
8. **Picture-in-Picture** - Native PiP support
9. **Siri Integration** - Voice commands
10. **CarPlay** - In-car playback
11. **+ 68 more features...**

### Migration Timeline

- **2026-02-08** - Gap analysis completed
- **2026-02-14** - All critical features migrated (Phases 1-3)
- **2026-02-14** - React Native app marked deprecated
- **Target Removal Date** - March 15, 2026 (30 days)

### For Developers

**If you need to work on iOS mobile:**
```bash
cd ios-app/
xcodebuild -scheme BayitPlusApp -destination 'platform=iOS Simulator,name=iPhone 17 Pro'
```

**Architecture:**
- Swift 5.9+
- SwiftUI for UI
- Swift Package Manager for dependencies
- MVVM architecture
- Combine for reactive programming

**Documentation:**
- See `/ios-app/docs/` for comprehensive documentation
- See `/docs/reviews/REACT_NATIVE_VS_NATIVE_IOS_COMPARISON.md` for feature comparison

### Android

**Note:** Android is handled by a separate Kotlin app in `/android-app/`. This deprecation only affects the React Native iOS implementation.

### Archive Information

This codebase is preserved in the `archive/react-native-mobile` branch for reference.

**To access archived code:**
```bash
git checkout archive/react-native-mobile
```

### Support

For questions about the migration or native iOS app:
- See migration docs: `/ios-app/docs/implementation/`
- Contact: iOS development team

---

**This directory will be removed on March 15, 2026.**

Until then, it remains for reference purposes only. **No new development or maintenance will occur.**
