# Volume Slider Cross-Platform Fix Guide

## Problem Summary

The `PlayerControls.tsx` component contains a native HTML `<input type="range">` element (lines 224-245) that only works on web browsers. This will cause **compilation failures** on iOS, tvOS, and Android because React Native does not have an `<input>` component.

**Affected File:**
```
/Users/olorin/Documents/olorin/olorin-media/bayit-plus/web/src/components/player/PlayerControls.tsx
Lines: 223-246
```

**Error Expected on Native Build:**
```
Error: Element type is invalid: expected a string (for built-in components) or a class/function
(for composite components) but got: undefined. You likely forgot to export your component from
the file it's defined in, or you might have mixed up default and named imports.

Check the render method of `PlayerControls`.
```

---

## Solution Architecture

### Approach: Platform-Specific Gating

Create a wrapper component that conditionally renders:
- **Web:** Native HTML `<input type="range">` (works perfectly on browsers)
- **Native (iOS/tvOS/Android):** `GlassSlider` component (React Native `Slider` equivalent)

---

## Implementation Steps

### Step 1: Create GlassSlider Component

**File:** `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/shared/components/GlassSlider.tsx`

```tsx
/**
 * GlassSlider - Cross-platform volume/slider component
 *
 * Renders native HTML <input type="range"> on web
 * Renders React Native Slider component on iOS/tvOS/Android
 */

import { Platform } from 'react-native'

// Web-only HTML input
if (Platform.OS === 'web') {
  export function GlassSlider({
    value,
    onValueChange,
    min = 0,
    max = 100,
    step = 1,
    ariaLabel,
    ariaValueNow,
    ariaValueMin,
    ariaValueMax,
    style,
  }: {
    value: number
    onValueChange: (value: number) => void
    min?: number
    max?: number
    step?: number
    ariaLabel?: string
    ariaValueNow?: number
    ariaValueMin?: number
    ariaValueMax?: number
    style?: any
  }) {
    return (
      <input
        type="range"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          onValueChange(parseFloat(e.target.value))
        }}
        min={min}
        max={max}
        step={step}
        aria-label={ariaLabel}
        aria-valuenow={ariaValueNow}
        aria-valuemin={ariaValueMin}
        aria-valuemax={ariaValueMax}
        style={{
          width: '100%',
          height: 32,
          accentColor: '#6366f1', // Adjust to your primary color
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 4,
          cursor: 'pointer',
          ...style,
        }}
      />
    )
  }
} else {
  // Native iOS/tvOS/Android Slider
  import { Slider } from 'react-native'
  import { colors } from '@bayit/shared/theme'

  export function GlassSlider({
    value,
    onValueChange,
    min = 0,
    max = 100,
    step = 1,
  }: {
    value: number
    onValueChange: (value: number | number[]) => void
    min?: number
    max?: number
    step?: number
  }) {
    return (
      <Slider
        style={{ height: 40, width: '100%' }}
        value={value}
        onValueChange={onValueChange}
        minimumValue={min}
        maximumValue={max}
        step={step}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.glassLight}
        thumbTintColor={colors.primary}
      />
    )
  }
}
```

**Alternative (Simpler): Direct Platform Check in PlayerControls**

If you prefer not to create a separate component, add this directly to PlayerControls:

```tsx
{Platform.OS === 'web' ? (
  // Web: Native HTML slider
  <input
    type="range"
    value={state.isMuted ? 0 : state.volume}
    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
      controls.handleVolumeChange(e)
    }}
    min={0}
    max={1}
    step={0.1}
    aria-label={t('player.volume')}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round((state.isMuted ? 0 : state.volume) * 100)}
    style={{
      width: '100%',
      height: isTV ? 40 : 32,
      accentColor: colors.primary,
      background: colors.glassLight,
      borderRadius: 4,
      cursor: 'pointer',
    }}
  />
) : (
  // Native: React Native Slider
  <Slider
    style={{ height: 40, width: '100%', flex: 1 }}
    value={state.isMuted ? 0 : state.volume}
    onValueChange={(value: number | number[]) => {
      const numValue = Array.isArray(value) ? value[0] : value
      controls.handleVolumeChange({ target: { value: numValue } } as any)
    }}
    minimumValue={0}
    maximumValue={1}
    step={0.1}
    minimumTrackTintColor={colors.primary}
    maximumTrackTintColor={colors.glassLight}
    thumbTintColor={colors.primary}
  />
)}
```

---

### Step 2: Update PlayerControls.tsx

**Original Code (Lines 207-246):**
```tsx
<View style={styles.volumeControls}>
  <Pressable
    onPress={(e) => { e.stopPropagation?.(); controls.toggleMute() }}
    onFocus={muteFocus.handleFocus}
    onBlur={muteFocus.handleBlur}
    focusable={true}
    style={({ hovered }) => [
      styles.controlButton,
      hovered && styles.controlButtonHovered,
      muteFocus.isFocused && muteFocus.focusStyle,
    ]}
    accessibilityRole="button"
    accessibilityLabel={state.isMuted ? t('player.unmute') : t('player.mute')}
  >
    {state.isMuted ? <VolumeX size={smallIconSize} color={colors.text} /> : <Volume2 size={smallIconSize} color={colors.text} />}
  </Pressable>
  <View style={styles.sliderContainer}>
    <input
      type="range"
      value={state.isMuted ? 0 : state.volume}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        controls.handleVolumeChange(e)
      }}
      min={0}
      max={1}
      step={0.1}
      aria-label={t('player.volume')}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round((state.isMuted ? 0 : state.volume) * 100)}
      style={{
        width: '100%',
        height: isTV ? 40 : 32,
        accentColor: colors.primary,
        background: colors.glassLight,
        borderRadius: 4,
        cursor: 'pointer',
      }}
    />
  </View>
</View>
```

**Replace With:**
```tsx
<View style={styles.volumeControls}>
  <Pressable
    onPress={(e) => { e.stopPropagation?.(); controls.toggleMute() }}
    onFocus={muteFocus.handleFocus}
    onBlur={muteFocus.handleBlur}
    focusable={true}
    style={({ hovered }) => [
      styles.controlButton,
      hovered && styles.controlButtonHovered,
      muteFocus.isFocused && muteFocus.focusStyle,
    ]}
    accessibilityRole="button"
    accessibilityLabel={state.isMuted ? t('player.unmute') : t('player.mute')}
  >
    {state.isMuted ? <VolumeX size={smallIconSize} color={colors.text} /> : <Volume2 size={smallIconSize} color={colors.text} />}
  </Pressable>
  <View style={styles.sliderContainer}>
    {Platform.OS === 'web' ? (
      // Web: Native HTML slider with full ARIA support
      <input
        type="range"
        value={state.isMuted ? 0 : state.volume}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          controls.handleVolumeChange(e)
        }}
        min={0}
        max={1}
        step={0.1}
        aria-label={t('player.volume')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((state.isMuted ? 0 : state.volume) * 100)}
        style={{
          width: '100%',
          height: isTV ? 40 : 32,
          accentColor: colors.primary,
          background: colors.glassLight,
          borderRadius: 4,
          cursor: 'pointer',
        }}
      />
    ) : (
      // Native: React Native Slider component
      <Slider
        style={{ height: 40, flex: 1 }}
        value={state.isMuted ? 0 : state.volume}
        onValueChange={(value: number | number[]) => {
          const numValue = Array.isArray(value) ? value[0] : value
          // Call the same handler with proper event object
          controls.handleVolumeChange({ target: { value: numValue } } as any)
        }}
        minimumValue={0}
        maximumValue={1}
        step={0.1}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.glassLight}
        thumbTintColor={colors.primary}
      />
    )}
  </View>
</View>
```

**Add Import at Top of File:**
```tsx
import { Slider } from 'react-native'
```

---

### Step 3: Update handleVolumeChange Handler

**Current Implementation (likely in parent component):**
```tsx
const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const newVolume = parseFloat(e.target.value)
  setVolume(newVolume)
}
```

**Update To Handle Both Web and Native:**
```tsx
const handleVolumeChange = (e: any) => {
  let newVolume: number

  if (Platform.OS === 'web') {
    // Web: React.ChangeEvent<HTMLInputElement>
    newVolume = parseFloat((e as React.ChangeEvent<HTMLInputElement>).target.value)
  } else {
    // Native: Direct number value from Slider
    newVolume = typeof e === 'number' ? e : e.target?.value ?? 0
  }

  // Clamp value between 0 and 1
  newVolume = Math.max(0, Math.min(1, newVolume))
  setVolume(newVolume)
  setIsMuted(newVolume === 0)
}
```

Or update the call site in PlayerControls:
```tsx
onValueChange={(value: number | number[]) => {
  const numValue = Array.isArray(value) ? value[0] : value
  controls.handleVolumeChange(numValue)  // Pass as number, not event
}}
```

---

## Testing Checklist

### Web Testing
- [ ] Test volume slider on Chrome desktop
- [ ] Test volume slider on Safari desktop
- [ ] Test volume slider on Firefox desktop
- [ ] Verify ARIA labels with accessibility inspector
- [ ] Test keyboard interaction (arrow keys, Home, End)
- [ ] Test with screen reader (NVDA, JAWS, or VoiceOver)
- [ ] Verify at 320px, 768px, 1920px viewports

### iOS Testing
- [ ] Build and run on iOS Simulator (iPhone SE, iPhone 15, iPhone 15 Pro Max)
- [ ] Test volume slider interaction with touch
- [ ] Verify volume changes smoothly (no jumps)
- [ ] Test with VoiceOver enabled
- [ ] Test accessibility announcement when volume changes
- [ ] Verify on iOS 16, 17, 18

### tvOS Testing
- [ ] Build and run on tvOS Simulator (Apple TV 4K)
- [ ] Test volume slider navigation with remote (arrow keys)
- [ ] Verify slider has visible focus indicator
- [ ] Test Siri Remote gestures (swipe, click)
- [ ] Verify 56x56pt touch target (if applicable to tvOS remote interaction)

### Android Testing
- [ ] Build and run on Android Emulator (Nexus 5X, Pixel 6, Tablet)
- [ ] Test volume slider interaction with touch
- [ ] Test with TalkBack enabled
- [ ] Verify accessibility announcement when volume changes
- [ ] Test on Android TV emulator
- [ ] Test with Pixel experience and AOSP

---

## Validation

After implementing the fix, verify:

1. **Build Succeeds:**
   ```bash
   # Web
   npm run build:web

   # iOS
   cd ios && xcodebuild -scheme Bayit -configuration Release

   # Android
   cd android && ./gradlew assembleRelease
   ```

2. **Volume Control Works:**
   - [ ] Mute/unmute button toggles correctly
   - [ ] Volume slider changes volume 0-100%
   - [ ] Volume persists across video changes
   - [ ] Volume setting is remembered on app restart

3. **Accessibility Works:**
   - [ ] ARIA labels visible in web inspector
   - [ ] Screen reader announces volume changes
   - [ ] Native screen reader (VoiceOver, TalkBack) announces value

4. **Performance:**
   - [ ] No noticeable lag when moving slider
   - [ ] Smooth animation on all platforms
   - [ ] Frame rate remains 60fps (mobile), 24fps (tvOS)

---

## Timeline Estimate

| Task | Duration | Notes |
|------|----------|-------|
| Implement platform check | 15 min | Simple if/else or separate component |
| Update PlayerControls | 10 min | Add import, replace JSX |
| Test on web | 10 min | Quick smoke test |
| Test on iOS | 20 min | Build + simulator test |
| Test on Android | 20 min | Build + emulator test |
| Test on tvOS | 10 min | Quick focus test |
| Git commit & push | 5 min | Create PR |
| **Total** | **~90 minutes** | ~1.5 hours for full implementation + testing |

---

## Rollback Plan

If issues arise:

```bash
# Revert to original (working on web only)
git revert <commit-hash>

# Or create a temporary feature flag
const useNativeSlider = Platform.OS !== 'web'
```

---

## Related Components

After fixing this issue, check for similar patterns in:
- [ ] Any other player control components
- [ ] Settings/configuration panels
- [ ] Search components (already checked - all good)

**Search command:**
```bash
grep -r "<input" --include="*.tsx" --include="*.ts" /Users/olorin/Documents/olorin/olorin-media/bayit-plus/web/src/components/player/
```

---

## Resources

- [React Native Platform docs](https://reactnative.dev/docs/platform)
- [React Native Slider component](https://reactnative.dev/docs/slider)
- [React Native Web Platform Support](https://necolas.github.io/react-native-web/docs/platform/)
- [ARIA Sliders](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)

