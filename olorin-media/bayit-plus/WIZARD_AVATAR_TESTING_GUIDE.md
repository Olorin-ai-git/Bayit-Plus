# WIZARD AVATAR COMPONENT - TESTING GUIDE

## Testing Date: 2026-01-21
## Component: WizardAvatar (Cross-Platform)
## Status: Ready for Testing

---

## QUICK START

### Prerequisites
```bash
# Verify you're in the correct directory
cd /Users/olorin/Documents/olorin/Bayit-Plus

# Verify video assets exist
ls -lh shared/assets/video/wizard/

# Should show:
# wizard-speaking-animation.mp4 (3.3 MB)
# wizard-speaking-with-audio.mp4 (3.2 MB)
```

---

## TEST 1: iOS SIMULATOR TESTING

### Device Coverage Required
- ✅ iPhone SE (smallest screen - 4.7")
- ✅ iPhone 15 (standard - 6.1")
- ✅ iPhone 15 Pro Max (largest - 6.7")
- ✅ iPad (tablet view - 10.2" or larger)

### Step-by-Step: iOS Testing

#### 1. Add Test Component to Mobile App

```bash
# Add test screen to mobile app
cp shared/test/WizardAvatarTest.tsx mobile-app/src/screens/WizardAvatarTestScreen.tsx
```

#### 2. Add Route to Navigation

Edit `mobile-app/src/navigation/AppNavigator.tsx`:

```typescript
import WizardAvatarTestScreen from '../screens/WizardAvatarTestScreen';

// Add to stack:
<Stack.Screen
  name="WizardAvatarTest"
  component={WizardAvatarTestScreen}
  options={{ title: 'Wizard Avatar Test' }}
/>
```

#### 3. Build and Run iOS

```bash
cd mobile-app

# Install dependencies
npm install

# Install iOS pods
cd ios && pod install && cd ..

# Run on iPhone 17 Pro (or available device)
npx react-native run-ios --simulator="iPhone 17 Pro"

# Or open in Xcode
open ios/BayitPlus.xcworkspace
```

#### 4. Test Cases for iOS

**Test Case 1: Video Playback**
- [ ] Video auto-plays on mount
- [ ] Audio plays (Olorin-deep voice)
- [ ] Video is 8 seconds duration
- [ ] Portrait orientation (720x1280)
- [ ] Smooth 24fps playback

**Test Case 2: Size Variants**
- [ ] Small (128x128px) displays correctly
- [ ] Medium (192x192px) displays correctly
- [ ] Large (256x256px) displays correctly
- [ ] XLarge (384x384px) displays correctly

**Test Case 3: Glass Design System**
- [ ] Backdrop blur effect visible
- [ ] Semi-transparent background (black/20)
- [ ] White border (white/10)
- [ ] Rounded corners (rounded-2xl)
- [ ] Playing indicator shows when playing

**Test Case 4: Controls**
- [ ] Auto-play works
- [ ] Loop works
- [ ] Mute/unmute works
- [ ] Silent mode (no audio) works
- [ ] Show/hide container works

**Test Case 5: Callbacks**
- [ ] onPlay fires when video starts
- [ ] onEnded fires when video completes
- [ ] onPause fires when video pauses

**Test Case 6: Error Handling**
- [ ] Displays error message if video fails to load
- [ ] Error UI uses Glass design system

**Test Case 7: Performance**
- [ ] No frame drops during playback
- [ ] Smooth animations
- [ ] No memory warnings
- [ ] App remains responsive

#### 5. Screenshot Capture (iOS)

```bash
# Capture screenshot from Xcode simulator
# Cmd+S or File > Screenshot

# Save to:
screenshots/ios/
├── iphone-se-small.png
├── iphone-se-medium.png
├── iphone-se-large.png
├── iphone-se-xlarge.png
├── iphone-15-large.png
├── iphone-15-pro-max-large.png
└── ipad-xlarge.png
```

---

## TEST 2: tvOS SIMULATOR TESTING

### Device Coverage Required
- ✅ Apple TV 4K (3rd generation)
- ✅ Test at 1080p and 4K resolutions

### Step-by-Step: tvOS Testing

#### 1. Add Test Component to tvOS App

```bash
# Add test screen to tvOS app
cp shared/test/WizardAvatarTest.tsx tvos-app/src/screens/WizardAvatarTestScreen.tsx
```

#### 2. Build and Run tvOS

```bash
cd tvos-app

# Install dependencies
npm install

# Install tvOS pods
cd ios && pod install && cd ..

# Run on Apple TV 4K
npx react-native run-ios --simulator="Apple TV 4K (3rd generation)"

# Or open in Xcode
open tvos/BayitPlusTVOS.xcworkspace
```

#### 3. Test Cases for tvOS

**Test Case 1: Focus Navigation**
- [ ] Component receives focus with Siri Remote
- [ ] Focus ring visible (white/60, 4px width)
- [ ] Focus ring animates smoothly
- [ ] No focus traps (can navigate away)

**Test Case 2: Siri Remote Gestures**
- [ ] Select button toggles play/pause
- [ ] Menu button navigates back
- [ ] Swipe gestures work
- [ ] Touch surface responds

**Test Case 3: TV Display Optimization**
- [ ] Text readable at 10-foot distance
- [ ] Colors vibrant on TV display
- [ ] Contrast ratios sufficient (WCAG AA)
- [ ] No color banding or artifacts

**Test Case 4: Video Playback (TV)**
- [ ] Video plays smoothly at 1080p
- [ ] Video plays smoothly at 4K
- [ ] Audio outputs to TV speakers
- [ ] No audio sync issues

**Test Case 5: Size Variants (TV)**
- [ ] Small (128px) - may be too small for TV
- [ ] Medium (192px) - may be too small for TV
- [ ] Large (256px) - acceptable for TV
- [ ] XLarge (384px) - recommended for TV

**Note:** Consider adding TV-specific size variants:
- TV-Large: 320px (w-80)
- TV-XLarge: 480px (w-120)

#### 4. Screenshot Capture (tvOS)

```bash
# Capture screenshot from Xcode simulator
# Cmd+S or File > Screenshot

# Save to:
screenshots/tvos/
├── appletv-4k-large.png
├── appletv-4k-xlarge.png
├── appletv-4k-focus-ring.png
└── appletv-1080p-large.png
```

---

## TEST 3: WEB BROWSER TESTING

### Browser Coverage Required
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

### Viewport Coverage Required
- ✅ Mobile (320px - 480px width)
- ✅ Tablet (768px - 1024px width)
- ✅ Desktop (1280px - 2560px width)

### Step-by-Step: Web Testing

#### 1. Add Test Page to Web App

Create `web/src/pages/WizardAvatarTestPage.tsx`:

```typescript
import React from 'react';
import { WizardAvatarTest } from '../../../shared/test/WizardAvatarTest';

export function WizardAvatarTestPage() {
  return <WizardAvatarTest />;
}

export default WizardAvatarTestPage;
```

#### 2. Build and Run Web App

```bash
cd web

# Install dependencies
npm install

# Start development server
npm run dev

# Or build for production
npm run build
npm run preview
```

#### 3. Navigate to Test Page

```
http://localhost:5173/wizard-avatar-test
```

#### 4. Test Cases for Web

**Test Case 1: Browser Compatibility**

**Chrome:**
- [ ] Video plays with H.264 codec
- [ ] Audio plays with AAC codec
- [ ] Inline playback works
- [ ] Auto-play policy respected
- [ ] Controls responsive

**Firefox:**
- [ ] Video plays
- [ ] Audio sync correct
- [ ] Performance smooth
- [ ] No console errors

**Safari:**
- [ ] Video plays with webkit-playsinline
- [ ] Audio plays
- [ ] Mobile Safari support
- [ ] Desktop Safari support

**Edge:**
- [ ] Video plays
- [ ] Audio sync correct
- [ ] Chromium-based compatibility

**Test Case 2: Responsive Design**

**Mobile (320px):**
- [ ] Small size (128px) fits viewport
- [ ] Touch targets adequate (44x44pt)
- [ ] Vertical scroll works
- [ ] Glassmorphism renders correctly

**Tablet (768px):**
- [ ] Medium size (192px) looks good
- [ ] Large size (256px) looks good
- [ ] Layout responsive

**Desktop (1280px+):**
- [ ] XLarge size (384px) looks impressive
- [ ] Centered layout
- [ ] Hover states work

**Test Case 3: Network Conditions**

- [ ] **Fast 4G:** Video loads quickly
- [ ] **Slow 3G:** Video loads with buffering
- [ ] **Offline:** Shows error message (bundled assets should work)

**Test Case 4: Caching**

- [ ] First visit: Downloads video (3.2 MB)
- [ ] Subsequent visits: Uses cached video
- [ ] Browser HTTP cache working
- [ ] No unnecessary re-downloads

**Test Case 5: Performance Metrics**

Use Lighthouse or WebPageTest:

- [ ] First Contentful Paint (FCP) < 1.5s
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] Time to Interactive (TTI) < 3.5s
- [ ] Total Blocking Time (TBT) < 300ms
- [ ] Cumulative Layout Shift (CLS) < 0.1

**Test Case 6: Accessibility**

- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Screen reader announces video
- [ ] Error messages readable by screen reader
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible

#### 5. Screenshot Capture (Web)

```bash
# Use browser DevTools or screenshot tools

# Save to:
screenshots/web/
├── chrome-desktop-large.png
├── chrome-mobile-small.png
├── firefox-desktop-large.png
├── safari-desktop-large.png
├── safari-mobile-medium.png
└── edge-desktop-xlarge.png
```

---

## TEST 4: CROSS-PLATFORM CONSISTENCY

### Consistency Checklist

**Visual Consistency:**
- [ ] Same glassmorphic design on all platforms
- [ ] Same backdrop blur intensity
- [ ] Same color scheme (black/20, white/10)
- [ ] Same rounded corners (rounded-2xl)

**Behavioral Consistency:**
- [ ] Auto-play works identically
- [ ] Loop behavior identical
- [ ] Mute/unmute identical
- [ ] Callbacks fire at same times

**Performance Consistency:**
- [ ] Smooth 24fps on all platforms
- [ ] No stuttering or jank
- [ ] Audio sync correct everywhere
- [ ] Load times acceptable

---

## TEST 5: EDGE CASES & ERROR HANDLING

### Edge Case Tests

**Test Case 1: Missing Assets**
```bash
# Temporarily rename video file
mv shared/assets/video/wizard/wizard-speaking-with-audio.mp4 \
   shared/assets/video/wizard/wizard-speaking-with-audio.mp4.bak

# Test: Should show error message
# Restore: mv *.bak back to original name
```

**Test Case 2: Network Interruption**
- [ ] Simulate network failure mid-playback
- [ ] Verify error handling
- [ ] Check recovery behavior

**Test Case 3: Low Memory**
- [ ] Test on low-end devices
- [ ] Monitor memory usage
- [ ] Verify no crashes

**Test Case 4: Rapid State Changes**
- [ ] Toggle autoPlay rapidly
- [ ] Toggle loop rapidly
- [ ] Change size rapidly
- [ ] Verify no crashes or state corruption

**Test Case 5: Orientation Changes (Mobile)**
- [ ] Portrait to landscape transition
- [ ] Landscape to portrait transition
- [ ] Video continues playing
- [ ] Layout adapts correctly

---

## AUTOMATED TESTING (OPTIONAL)

### Unit Tests

```typescript
// Example: WizardAvatar.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { WizardAvatar } from './WizardAvatar';

describe('WizardAvatar', () => {
  it('renders correctly', () => {
    const { getByTestId } = render(<WizardAvatar />);
    // Add assertions
  });

  it('calls onPlay when video starts', () => {
    const onPlay = jest.fn();
    const { getByTestId } = render(<WizardAvatar onPlay={onPlay} />);
    // Simulate play event
    expect(onPlay).toHaveBeenCalled();
  });
});
```

### Integration Tests

```typescript
// Example: Playwright (Web)
import { test, expect } from '@playwright/test';

test('wizard avatar plays video', async ({ page }) => {
  await page.goto('/wizard-avatar-test');

  // Wait for video to load
  const video = page.locator('video');
  await expect(video).toBeVisible();

  // Check video playing
  const isPaused = await video.evaluate(v => (v as HTMLVideoElement).paused);
  expect(isPaused).toBe(false);
});
```

---

## TESTING CHECKLIST

### Pre-Testing
- [x] Video assets exist in `shared/assets/video/wizard/`
- [x] Component files created
- [x] Test component created
- [x] Bundled assets deployment documented

### iOS Testing
- [ ] iPhone SE tested
- [ ] iPhone 15 tested
- [ ] iPhone 15 Pro Max tested
- [ ] iPad tested
- [ ] Screenshots captured
- [ ] All test cases passed

### tvOS Testing
- [ ] Apple TV 4K tested
- [ ] Focus navigation working
- [ ] Siri Remote gestures working
- [ ] Screenshots captured
- [ ] All test cases passed

### Web Testing
- [ ] Chrome tested
- [ ] Firefox tested
- [ ] Safari tested
- [ ] Edge tested
- [ ] Mobile responsive tested
- [ ] Desktop responsive tested
- [ ] Screenshots captured
- [ ] Performance metrics acceptable
- [ ] Accessibility verified

### Cross-Platform
- [ ] Visual consistency verified
- [ ] Behavioral consistency verified
- [ ] Performance consistency verified

### Edge Cases
- [ ] Missing assets handled
- [ ] Network errors handled
- [ ] Low memory tested
- [ ] Rapid state changes tested
- [ ] Orientation changes tested

---

## ISSUE REPORTING

If you encounter any issues during testing:

### Issue Template

```markdown
## Issue: [Brief Description]

**Platform:** [iOS/tvOS/Web]
**Device/Browser:** [Specific device or browser]
**Component Version:** 1.0.0
**Date:** 2026-01-21

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**


**Actual Behavior:**


**Screenshots/Videos:**
[Attach if applicable]

**Console Logs:**
[Attach if applicable]

**Severity:** [Critical/Major/Minor]
```

---

## SUCCESS CRITERIA

The WizardAvatar component is considered **fully tested and ready for production** when:

✅ **All platforms tested:**
- iOS (3 device sizes minimum)
- tvOS (Apple TV 4K)
- Web (4 browsers minimum)

✅ **All test cases passed:**
- Video playback works
- Audio playback correct
- Controls functional
- Callbacks firing
- Error handling robust

✅ **Screenshots captured:**
- Minimum 7 iOS screenshots
- Minimum 4 tvOS screenshots
- Minimum 6 web screenshots

✅ **Performance acceptable:**
- No lag or stuttering
- Smooth animations
- Acceptable load times
- No memory issues

✅ **Accessibility verified:**
- Screen reader support
- Keyboard navigation
- Focus indicators
- Contrast ratios

✅ **No critical issues:**
- Zero crashes
- Zero data corruption
- Zero security vulnerabilities

---

## NEXT STEPS AFTER TESTING

1. **Document Test Results**
   - Create `WIZARD_AVATAR_TEST_RESULTS.md`
   - Include all screenshots
   - List any issues found
   - Note performance metrics

2. **Create Deployment Report**
   - Summarize testing
   - Provide production readiness assessment
   - Include deployment recommendations

3. **Deploy to Staging**
   - Test in staging environment
   - Verify bundled assets work
   - Monitor metrics

4. **Deploy to Production**
   - Follow standard deployment process
   - Monitor error rates
   - Track user feedback

---

**Testing Guide Version:** 1.0
**Last Updated:** 2026-01-21
**Component Version:** 1.0.0
