# WizardAvatar Component

## Overview

The `WizardAvatar` component displays the Olorin wizard character with a speaking animation. It's a **truly cross-platform** component that works on Web, iOS mobile, and tvOS, using glassmorphic design principles.

### Platform-Specific Architecture

The component uses platform-specific implementations for optimal performance:

- **Web** (`WizardAvatar.web.tsx`): HTML5 `<video>` element for browser playback
- **React Native** (`WizardAvatar.native.tsx`): `react-native-video` for iOS/tvOS playback
- **Entry Point** (`WizardAvatar.tsx`): Auto-routes to correct implementation

Metro bundler automatically selects the appropriate implementation based on the target platform during build.

## Prerequisites

### 1. Combine Video with Audio

Before using this component, you must run the following ffmpeg command to create the video with audio:

```bash
cd /Users/olorin/Documents/Bayit-Plus

ffmpeg -i "shared/assets/video/wizard/wizard-speaking-animation.mp4" \
       -i "shared/assets/audio/intro/Olorin-deep.mp3" \
       -c:v copy \
       -c:a aac \
       -b:a 192k \
       -shortest \
       "shared/assets/video/wizard/wizard-speaking-with-audio.mp4" \
       -y
```

**Command Explanation:**
- `-c:v copy` - Copy video codec (maintains H.264 quality, no re-encoding)
- `-c:a aac` - Audio codec AAC for broad compatibility
- `-b:a 192k` - Audio bitrate 192kbps for high quality
- `-shortest` - End output when shortest stream ends (8 seconds video duration)
- `-y` - Overwrite output file if it exists

### 2. Install Dependencies

**For React Native (iOS/tvOS):**
```bash
cd mobile-app  # or tvos-app
npm install expo-av
```

**For Web:**
No additional dependencies required (uses native HTML5 video)

## Usage

### Basic Usage

```tsx
import { WizardAvatar } from '@/shared/components/WizardAvatar';

function MyComponent() {
  return (
    <WizardAvatar
      autoPlay={true}
      loop={false}
      size="large"
    />
  );
}
```

### With Callbacks

```tsx
import { WizardAvatar } from '@/shared/components/WizardAvatar';

function InteractiveWizard() {
  const handleSpeakingEnd = () => {
    console.log('Wizard finished speaking');
    // Trigger next action
  };

  const handlePlay = () => {
    console.log('Wizard started speaking');
  };

  return (
    <WizardAvatar
      autoPlay={true}
      loop={false}
      size="large"
      onEnded={handleSpeakingEnd}
      onPlay={handlePlay}
      muted={false}
    />
  );
}
```

### Silent Mode (No Audio)

```tsx
import { WizardAvatar } from '@/shared/components/WizardAvatar';

function SilentWizard() {
  return (
    <WizardAvatar
      silent={true}  // Uses wizard-speaking-animation.mp4 (no audio)
      autoPlay={true}
      loop={true}
      size="medium"
    />
  );
}
```

### Without Container (Raw Video)

```tsx
import { WizardAvatar } from '@/shared/components/WizardAvatar';

function MinimalWizard() {
  return (
    <WizardAvatar
      showContainer={false}  // No glassmorphic container
      size="small"
      className="custom-styling"
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `autoPlay` | `boolean` | `true` | Whether the video should auto-play on mount |
| `loop` | `boolean` | `false` | Whether the video should loop continuously |
| `muted` | `boolean` | `false` | Whether the video should be muted |
| `size` | `'small' \| 'medium' \| 'large' \| 'xlarge'` | `'large'` | Size variant for the avatar |
| `onEnded` | `() => void` | - | Callback fired when video ends |
| `onPlay` | `() => void` | - | Callback fired when video starts playing |
| `onPause` | `() => void` | - | Callback fired when video is paused |
| `silent` | `boolean` | `false` | Use silent version (no audio track) |
| `className` | `string` | `''` | Additional className for styling |
| `showContainer` | `boolean` | `true` | Whether to show glassmorphic container |

## Size Dimensions

| Size | Dimensions | Best For |
|------|------------|----------|
| `small` | 128x128px (w-32 h-32) | Compact UI, sidebars, notifications |
| `medium` | 192x192px (w-48 h-48) | Cards, lists, chat bubbles |
| `large` | 256x256px (w-64 h-64) | Featured display, main avatar |
| `xlarge` | 384x384px (w-96 h-96) | Full-screen, intro sequences |

## Platform-Specific Behavior

### Web
- Uses native HTML5 `<video>` element
- Auto-play may require user interaction (browser policy)
- Supports all standard video controls

### iOS (React Native)
- Uses `expo-av` Video component
- Requires `expo-av` dependency
- Handles safe area insets automatically
- Supports haptic feedback via Glass components

### tvOS
- Uses `expo-av` Video component
- Optimized for 10-foot viewing distance
- Supports tvOS focus navigation
- Remote control compatible

## Styling

The component follows the Glass Design System:
- **Dark mode by default** - Optimized for dark backgrounds
- **Backdrop blur effects** - Frosted glass aesthetic
- **Transparency layers** - Semi-transparent backgrounds (bg-black/20)
- **TailwindCSS only** - All styling via utility classes
- **No inline styles** - Except computed values for video aspect ratio

### Custom Styling

Add custom TailwindCSS classes via the `className` prop:

```tsx
<WizardAvatar
  className="shadow-2xl ring-4 ring-purple-500/50"
  size="large"
/>
```

## Asset Paths

All asset paths are managed through `shared/config/assetPaths.ts`:

```typescript
import { ASSET_PATHS } from '@/shared/config/assetPaths';

// Video with audio
ASSET_PATHS.video.wizard.speaking
// → 'shared/assets/video/wizard/wizard-speaking-with-audio.mp4'

// Video without audio
ASSET_PATHS.video.wizard.speakingSilent
// → 'shared/assets/video/wizard/wizard-speaking-animation.mp4'
```

**Never hardcode paths in components!** Always use the centralized configuration.

## Accessibility

The component includes:
- Error states with clear messaging
- Loading indicators
- Keyboard-accessible video controls (web)
- Screen reader support (via aria labels on container)

## Performance

- **Video codec:** H.264 (3478 kb/s)
- **Audio codec:** AAC (192 kb/s)
- **File size:** ~3.3 MB (8 seconds)
- **Resolution:** 720x1280 (portrait)
- **Frame rate:** 24 fps

## Troubleshooting

### Video doesn't auto-play (Web)
- Modern browsers block auto-play with sound
- Solution: Set `muted={true}` or require user interaction

### Video not showing (React Native)
- Ensure `expo-av` is installed
- Check video file path is accessible
- Verify video format is supported (H.264/AAC)

### Audio out of sync
- Re-run the ffmpeg command
- Ensure audio file duration matches video (8 seconds)

### Poor performance
- Use smaller size variant
- Consider using `silent={true}` to reduce bandwidth
- Optimize video encoding settings

## Examples

### Voice Assistant Integration

```tsx
import { WizardAvatar } from '@/shared/components/WizardAvatar';
import { useTTS } from '@/hooks/useTTS';

function VoiceAssistant() {
  const { speak, isSpeaking } = useTTS();

  return (
    <View className="flex items-center justify-center p-8">
      <WizardAvatar
        autoPlay={isSpeaking}
        loop={isSpeaking}
        silent={true}  // Use TTS instead of video audio
        size="large"
      />
      <GlassButton
        onPress={() => speak('Welcome to Bayit Plus!')}
        className="mt-4"
      >
        Speak
      </GlassButton>
    </View>
  );
}
```

### Intro Sequence

```tsx
import { WizardAvatar } from '@/shared/components/WizardAvatar';
import { useNavigation } from '@react-navigation/native';

function IntroScreen() {
  const navigation = useNavigation();

  const handleIntroEnd = () => {
    navigation.navigate('Home');
  };

  return (
    <View className="flex-1 bg-black items-center justify-center">
      <WizardAvatar
        autoPlay={true}
        loop={false}
        muted={false}
        size="xlarge"
        onEnded={handleIntroEnd}
      />
      <Text className="text-white text-xl mt-8">
        Welcome to Bayit+
      </Text>
    </View>
  );
}
```

## Design System Compliance

✅ **TailwindCSS Only** - All styling via utility classes
✅ **Glass Components** - Uses GlassCard wrapper
✅ **Dark Mode** - Glassmorphic dark design
✅ **No Hardcoded Values** - Centralized configuration
✅ **Cross-Platform** - Web, iOS, tvOS support
✅ **Accessibility** - Error states, indicators
✅ **Documented Exception** - Video element (no Glass alternative)

## License

Proprietary - Bayit Plus Platform
