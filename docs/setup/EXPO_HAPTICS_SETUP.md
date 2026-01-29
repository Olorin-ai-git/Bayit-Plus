# Expo Haptics Setup

## Installation

Haptic feedback has been implemented in the voice system using `expo-haptics`.

### Required Package

```bash
# Using npm
npm install expo-haptics --save

# Using yarn
yarn add expo-haptics
```

### Platform Support

- ✅ iOS (all devices with Taptic Engine)
- ✅ Android (devices with vibration motor)
- ❌ Web (gracefully disabled, no haptics)
- ❌ tvOS (no haptic hardware)

### Implementation

Haptic feedback is automatically triggered for:

1. **Voice Activation** (`voiceActivationFeedback`)
   - When: User taps FAB button to activate voice
   - Type: Light impact
   - File: `VoiceAvatarFAB.tsx`

2. **Listening Start** (`voiceListeningFeedback`)
   - When: Voice listening begins
   - Type: Warning notification
   - File: `useVoiceLifecycle.ts`

3. **Success** (`voiceSuccessFeedback`)
   - When: Voice command successfully processed
   - Type: Success notification
   - File: `useVoiceLifecycle.ts`

4. **Error** (`voiceErrorFeedback`)
   - When: Voice operation fails
   - Type: Error notification
   - File: `useVoiceLifecycle.ts`

5. **Mode Change** (`voiceModeChangeFeedback`)
   - When: Avatar visibility mode changes
   - Type: Selection feedback
   - File: `voiceHaptics.ts`

### Graceful Degradation

The haptic utility is designed to fail gracefully when `expo-haptics` is not installed:

- No errors or crashes
- Warnings logged to console (development only)
- Voice functionality works normally without haptics

### Testing

After installation:

1. Build the mobile app for iOS or Android
2. Test voice activation by tapping the FAB
3. Verify haptic feedback occurs on:
   - Voice activation
   - Listening start
   - Command success
   - Error states

### Files Modified

- `shared/utils/voiceHaptics.ts` - Haptic feedback utilities
- `shared/components/support/VoiceAvatarFAB.tsx` - Activation feedback
- `shared/hooks/useVoiceLifecycle.ts` - State change feedback

### Rollback

If haptic feedback needs to be disabled:

1. Uninstall: `npm uninstall expo-haptics`
2. The code will gracefully disable haptics automatically
3. No code changes required
