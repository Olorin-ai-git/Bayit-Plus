# iOS/Android Testing Checklist

## Overview

This checklist must be completed for **EVERY component migration** before marking as complete.

**CRITICAL**: This is a React Native Web cross-platform codebase. Changes to web can break iOS/Android/tvOS apps.

---

## iOS Testing (Mandatory)

### Prerequisites
- [ ] iOS Simulator installed (via Xcode)
- [ ] React Native development environment configured
- [ ] Metro bundler running

### Device Matrix
Test on ALL three device sizes:
- [ ] iPhone SE (375x667) - Smallest size
- [ ] iPhone 15 (390x844) - Standard size
- [ ] iPhone 15 Pro Max (430x932) - Largest size

### Test Cases

#### TC-iOS-1: Visual Fidelity
- [ ] Launch iOS Simulator for each device size
- [ ] Navigate to migrated component
- [ ] Compare side-by-side with baseline screenshots
- [ ] Verify: spacing, colors, glassmorphism, animations
- [ ] **Capture screenshots** of all device sizes

**Command**:
```bash
# Launch iOS Simulator
npx react-native run-ios --simulator="iPhone SE (3rd generation)"
npx react-native run-ios --simulator="iPhone 15"
npx react-native run-ios --simulator="iPhone 15 Pro Max"
```

#### TC-iOS-2: Touch Targets
- [ ] Run automated validation: `./scripts/validate-touch-targets.sh`
- [ ] Manually tap ALL interactive elements
- [ ] Verify 44x44pt minimum (no "hard to tap" feedback)
- [ ] Check hitSlop is applied for small visual elements

**Touch Target Rules**:
- Minimum: 44x44pt (iOS HIG)
- Recommended: 48x48pt
- Use `hitSlop` prop for smaller visual elements

#### TC-iOS-3: Safe Area Insets
- [ ] Test on iPhone 15 Pro (Dynamic Island)
- [ ] Test on iPhone X (notch)
- [ ] Verify content doesn't overlap:
  - Status bar (top)
  - Home indicator (bottom)
  - Dynamic Island (top center)

**Safe Area Check**:
```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const insets = useSafeAreaInsets();
// Apply: paddingTop: insets.top, paddingBottom: insets.bottom
```

#### TC-iOS-4: VoiceOver Accessibility
- [ ] Enable VoiceOver: Settings → Accessibility → VoiceOver → ON
- [ ] Navigate component with swipe gestures
- [ ] Verify all elements have accessibilityLabel
- [ ] Verify logical navigation order
- [ ] Verify state changes are announced

**VoiceOver Gestures**:
- Swipe right: Next element
- Swipe left: Previous element
- Double tap: Activate
- Two-finger swipe down: Read from top

#### TC-iOS-5: Dynamic Type
- [ ] Settings → Accessibility → Display & Text Size → Larger Text
- [ ] Test at 100%, 150%, 200% scaling
- [ ] Verify text doesn't truncate
- [ ] Verify layout adapts gracefully

---

## Android Testing (Mandatory)

### Prerequisites
- [ ] Android Studio installed
- [ ] Android Emulator configured
- [ ] ADB tools available

### Device Matrix
Test on TWO device sizes:
- [ ] Pixel 4a (393x851) - Standard Android
- [ ] Pixel 7 (412x915) - Modern Android

### Test Cases

#### TC-Android-1: Visual Fidelity
- [ ] Launch Android Emulator for each device
- [ ] Navigate to migrated component
- [ ] Compare with baseline screenshots
- [ ] Verify glassmorphism effects (may differ from iOS)
- [ ] **Capture screenshots** of both devices

**Command**:
```bash
# Launch Android Emulator
npx react-native run-android
```

#### TC-Android-2: Touch Targets
- [ ] Run automated validation: `./scripts/validate-touch-targets.sh`
- [ ] Manually tap ALL interactive elements
- [ ] Verify 48x48dp minimum (Material Design)

**Touch Target Rules**:
- Minimum: 48x48dp (Material Design)
- Recommended: 56x56dp

#### TC-Android-3: TalkBack Accessibility
- [ ] Enable TalkBack: Settings → Accessibility → TalkBack → ON
- [ ] Navigate with swipe gestures
- [ ] Verify labels and hints
- [ ] Verify navigation order

**TalkBack Gestures**:
- Swipe right: Next element
- Swipe left: Previous element
- Double tap: Activate

---

## tvOS Testing (If TV-Enabled)

### Prerequisites
- [ ] Apple TV 4K Simulator installed
- [ ] Siri Remote simulation enabled

### Device
- [ ] Apple TV 4K (1920x1080) - tvOS 17+

### Test Cases

#### TC-TV-1: Focus Navigation
- [ ] Launch tvOS Simulator
- [ ] Navigate component with arrow keys (Siri Remote simulation)
- [ ] Verify focus moves in all 4 directions (up, down, left, right)
- [ ] Verify no "focus traps" (can always navigate out)

**Command**:
```bash
npx react-native run-ios --simulator="Apple TV"
```

#### TC-TV-2: Focus Visual Indicators
- [ ] Verify focus ring/border clearly visible
- [ ] Verify scale animation smooth (1.0 → 1.08)
- [ ] Verify purple glow effect renders

#### TC-TV-3: 10-Foot UI
- [ ] Stand 10 feet from screen
- [ ] Verify all text readable (minimum 16pt)
- [ ] Verify touch targets large enough (60x60pt minimum)
- [ ] Verify button labels clear

#### TC-TV-4: Siri Remote Gestures
- [ ] Test swipe gestures (navigation)
- [ ] Test select button (activation)
- [ ] Test menu button (back navigation)

#### TC-TV-5: Drag Interactions
- [ ] ⚠️ Siri Remote doesn't support drag
- [ ] Convert drag-to-resize → toggle button
- [ ] Test alternative interaction pattern

---

## RTL Testing (Hebrew/Arabic)

### Prerequisites
- [ ] i18n configured with Hebrew support
- [ ] RTL layout enabled

### Test Cases

#### TC-RTL-1: Layout Mirroring
- [ ] Navigate to: `http://localhost:3000/?lng=he`
- [ ] Verify entire layout mirrors horizontally
- [ ] Verify icon positions swap
- [ ] Verify text alignment correct
- [ ] **Capture screenshot of RTL layout**

#### TC-RTL-2: Logical Properties
- [ ] Run validation: `grep -r "margin-left\|padding-left" src/components/`
- [ ] Should return ZERO results (use margin-start/padding-start instead)

#### TC-RTL-3: Bidirectional Text
- [ ] Test mixed English + Hebrew text
- [ ] Verify proper bidi algorithm handling
- [ ] Verify punctuation positioning correct

---

## Performance Testing

### TC-PERF-1: Frame Rate
- [ ] Open React DevTools Profiler
- [ ] Perform all interactions (hover, click, drag, scroll)
- [ ] Verify consistent 60fps (no drops below 55fps)

### TC-PERF-2: Memory Usage
- [ ] Monitor memory in Xcode/Android Studio
- [ ] Verify no memory leaks
- [ ] Verify garbage collection working

---

## Regression Sign-Off

**After completing ALL tests above**:

- [ ] All iOS tests passed (3 devices)
- [ ] All Android tests passed (2 devices)
- [ ] All tvOS tests passed (if applicable)
- [ ] All RTL tests passed
- [ ] All performance tests passed
- [ ] Screenshots captured for all devices
- [ ] No regressions found

**Tested by**: _________________
**Date**: _________________
**Component**: _________________

---

## Failure Handling

**If ANY test fails**:
1. ❌ Mark migration as INCOMPLETE
2. 🐛 Document failure in issue tracker
3. 🔧 Fix the issue
4. ♻️ Re-run ALL tests
5. ✅ Only proceed when ALL tests pass

**DO NOT**:
- Skip failing tests
- Mark as "known issue"
- Proceed to next component with failures

---

## Quick Reference Commands

```bash
# iOS Simulators
xcrun simctl list devices | grep Booted
npx react-native run-ios --simulator="iPhone 15"

# Android Emulators
emulator -list-avds
npx react-native run-android

# tvOS
npx react-native run-ios --simulator="Apple TV"

# Validation Scripts
./scripts/validate-touch-targets.sh
./scripts/detect-stylesheets.sh

# Performance
npx react-native log-ios    # iOS logs
npx react-native log-android # Android logs
```

---

## Automation (Future Enhancement)

Consider automating:
- [ ] Screenshot capture across all devices
- [ ] Touch target validation in CI/CD
- [ ] Accessibility tree validation
- [ ] Performance regression detection

---

**Remember**: This is a CROSS-PLATFORM codebase. Testing on web only is NOT sufficient.
