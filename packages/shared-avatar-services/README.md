# @bayit/shared-avatar-services

Shared avatar services for the Bayit+ streaming platform. Provides cross-platform avatar generation (Zeh Ani), state management, and user preferences.

## Features

- **Avatar Generation**: Generate 3D mesh avatars from photos using Zeh Ani
- **State Management**: Track avatar visual state and animations
- **Preferences**: Manage user avatar preferences with persistence
- **Progress Tracking**: Real-time progress updates for avatar generation

## Installation

```bash
npm install @bayit/shared-avatar-services
```

## Usage

### Avatar Generation

```typescript
import { AvatarGenerationService } from '@bayit/shared-avatar-services';

const service = new AvatarGenerationService({
  apiKey: process.env.ZEH_ANI_API_KEY,
  apiUrl: 'https://api.zeh-ani.com'
});

// Generate avatar
const result = await service.generateAvatar({
  userId: 'user-123',
  photoUrl: 'https://example.com/photo.jpg',
  style: 'realistic',
  quality: 'high'
});

console.log(result.avatarId);
console.log(result.meshUrl);

// Track progress
const unsubscribe = service.onProgress(result.avatarId, (progress) => {
  console.log(`Progress: ${progress.progress * 100}%`);
  console.log(`Status: ${progress.status}`);
});

// Get avatar later
const avatar = await service.getAvatar(result.avatarId);
```

### Avatar State Management

```typescript
import { avatarStateManager } from '@bayit/shared-avatar-services';

// Show avatar
avatarStateManager.show();

// Start speaking
avatarStateManager.startSpeaking();

// Set emotion based on frustration
avatarStateManager.setEmotionFromFrustration(0.8); // High frustration = apologetic

// Listen to state changes
const unsubscribe = avatarStateManager.addListener((state) => {
  console.log('Current emotion:', state.currentEmotion);
  console.log('Current animation:', state.currentAnimation);
  console.log('Is speaking:', state.isSpeaking);
});

// Stop speaking
avatarStateManager.stopSpeaking();

// Hide avatar
avatarStateManager.hide();
```

### Avatar Preferences

```typescript
import { AvatarPreferencesManager } from '@bayit/shared-avatar-services';

// Create manager with storage adapter
const preferencesManager = new AvatarPreferencesManager(
  {
    enabled: true,
    style: 'realistic',
    quality: 'high'
  },
  storageAdapter // Platform-specific storage
);

// Initialize from storage
await preferencesManager.initialize();

// Update preferences
await preferencesManager.updatePreferences({
  position: 'bottom-right',
  size: 'large',
  showOnStartup: true
});

// Enable/disable features
await preferencesManager.enableAnimations();
await preferencesManager.enableEmotions();
await preferencesManager.disableVoice();

// Listen to changes
const unsubscribe = preferencesManager.addListener((preferences) => {
  console.log('Preferences updated:', preferences);
});

// Get current preferences
const prefs = preferencesManager.getPreferences();
console.log(prefs.enabled);
console.log(prefs.position);
console.log(prefs.size);
```

## API Reference

### Avatar Generation

#### `AvatarGenerationService`

Main service for avatar generation.

**Constructor:**
```typescript
new AvatarGenerationService(config: ZehAniConfig)
```

**Methods:**
- `generateAvatar(request)` - Generate avatar from photo
- `getAvatar(avatarId)` - Get generated avatar
- `deleteAvatar(avatarId)` - Delete avatar
- `getProgress(avatarId)` - Get generation progress
- `onProgress(avatarId, listener)` - Subscribe to progress updates
- `clearCache()` - Clear cached avatars
- `getCachedAvatars()` - Get all cached avatars

#### `ZehAniClient`

Low-level client for Zeh Ani API.

**Methods:**
- `generateAvatar(request)` - Create avatar generation request
- `getProgress(avatarId)` - Check generation progress
- `getAvatar(avatarId)` - Fetch avatar data
- `deleteAvatar(avatarId)` - Remove avatar

### Avatar State

#### `AvatarStateManager`

Manages avatar visual state and animations.

**Methods:**
- `getState()` - Get current state
- `updateState(update)` - Update state
- `show()` - Show avatar
- `hide()` - Hide avatar
- `setEmotion(emotion)` - Set emotion
- `setEmotionFromFrustration(level)` - Map frustration to emotion
- `setAnimation(animation)` - Set animation
- `startSpeaking()` - Start speaking state
- `stopSpeaking()` - Stop speaking state
- `startListening()` - Start listening state
- `stopListening()` - Stop listening state
- `reset()` - Reset to defaults
- `addListener(listener)` - Subscribe to state changes
- `removeListener(listener)` - Unsubscribe from state changes

**Emotions:**
- `neutral`, `happy`, `excited`, `thinking`, `confused`, `empathetic`, `apologetic`

**Animations:**
- `idle`, `talking`, `listening`, `thinking`, `nodding`, `greeting`, `waving`

### Avatar Preferences

#### `AvatarPreferencesManager`

Manages user avatar preferences with persistence.

**Constructor:**
```typescript
new AvatarPreferencesManager(
  initialPreferences?: Partial<AvatarPreferences>,
  storageAdapter?: PreferencesStorageAdapter
)
```

**Methods:**
- `initialize()` - Load from storage
- `getPreferences()` - Get current preferences
- `updatePreferences(update)` - Update preferences
- `enable()` - Enable avatar
- `disable()` - Disable avatar
- `setAvatarId(id)` - Set current avatar
- `setPosition(position)` - Set screen position
- `setSize(size)` - Set avatar size
- `setStyle(style)` - Set visual style
- `setQuality(quality)` - Set render quality
- `enableVoice()` / `disableVoice()` - Toggle voice
- `enableAnimations()` / `disableAnimations()` - Toggle animations
- `enableEmotions()` / `disableEmotions()` - Toggle emotions
- `reset()` - Reset to defaults
- `clear()` - Clear all preferences
- `addListener(listener)` - Subscribe to changes

**Storage Adapter Interface:**
```typescript
interface PreferencesStorageAdapter {
  save(preferences: AvatarPreferences): Promise<void>;
  load(): Promise<AvatarPreferences | null>;
  clear(): Promise<void>;
}
```

## Emotion Mapping

Frustration levels automatically map to avatar emotions:

| Frustration | Emotion |
|-------------|---------|
| 0.8+ | apologetic |
| 0.6 - 0.8 | empathetic |
| 0.4 - 0.6 | thinking |
| 0.2 - 0.4 | happy |
| 0.0 - 0.2 | excited |

## Testing

```bash
npm test
npm run test:coverage
```

## License

Proprietary - Olorin Media Group
