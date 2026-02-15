# Widget Integration Usage Guide

**Status:** ✅ Complete
**Date:** 2026-02-14
**Platform:** iOS React Native

## Overview

The widget integration automatically syncs user authentication and playback progress with the iOS Continue Watching widget. This guide explains how the integration works and how to use it in your code.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    React Native App                       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────┐          ┌────────────────────┐    │
│  │ Authentication  │────────▶ │ Widget Service     │    │
│  │ (Login/Logout)  │          │ (Share Auth Token) │    │
│  └─────────────────┘          └────────────────────┘    │
│                                         │                 │
│  ┌─────────────────┐                   │                 │
│  │ Player Screens  │────────▶ ┌────────▼──────────┐     │
│  │ (Podcast/Audio) │          │ usePlaybackSync   │     │
│  └─────────────────┘          │ (Auto-sync hook)  │     │
│                               └───────────────────┘     │
│                                         │                 │
│  ┌─────────────────┐                   │                 │
│  │ App Lifecycle   │                   │                 │
│  │ (Foreground)    │───────────────────┘                 │
│  └─────────────────┘                                     │
│                                                           │
└──────────────────────────────────────────────────────────┘
                              │
                              │ App Groups
                              ▼
┌──────────────────────────────────────────────────────────┐
│                  iOS Continue Watching Widget             │
│  • Reads auth_token from App Groups                      │
│  • Reads continue_watching JSON from App Groups           │
│  • Makes API requests to backend                          │
│  • Displays on home screen                                │
└──────────────────────────────────────────────────────────┘
```

## Automatic Integration Points

The widget integration is **already integrated** at these key points:

### 1. App Launch (✅ Integrated)

**File:** `src/components/AppContent.tsx`

```typescript
useEffect(() => {
  const initializeApp = async () => {
    // ... other initialization

    // Initialize widget with auth token (iOS only)
    await initializeWidgetOnLaunch()
  }

  initializeApp()
}, [])
```

**What it does:**
- Checks if user is logged in
- Shares auth token with widget
- Fetches and shares continue watching data

### 2. App Foreground (✅ Integrated)

**File:** `src/components/AppContent.tsx`

```typescript
const handleAppStateChange = (nextAppState: AppStateStatus) => {
  if (nextAppState === 'active') {
    // App came to foreground - refresh widget data
    handleAppForeground()
  }
}
```

**What it does:**
- Detects when app comes to foreground
- Refreshes continue watching data
- Updates widget timeline

### 3. Audiobook Playback (✅ Integrated)

**File:** `src/screens/AudiobookPlayerScreen.tsx`

```typescript
usePlaybackSync(
  audiobookId,
  audiobook.title,
  'audiobook',
  audiobook.cover,
  () => position,
  duration,
  playbackState === State.Playing
)
```

**What it does:**
- Automatically updates widget every 30 seconds during playback
- Saves progress when user exits player
- Only updates if playing and position > 10 seconds

### 4. Podcast Playback (✅ Integrated)

**File:** `src/screens/PodcastPlayerScreen.tsx`

```typescript
usePlaybackSync(
  episodeId,
  episode.title,
  'podcast',
  episode.cover,
  () => position,
  duration,
  playbackState === State.Playing
)
```

**What it does:**
- Same as audiobook integration
- Updates widget with podcast progress

## Manual Integration (When Needed)

For new player screens or custom authentication flows:

### Authentication Integration

#### On Login Success

```typescript
import { handleAuthSuccess } from '@/utils/authWidgetIntegration'

const handleLogin = async (email: string, password: string) => {
  const { token } = await loginAPI(email, password)

  // Store token
  await storage.setItem('auth_token', token)

  // Share with widget (iOS only)
  await handleAuthSuccess(token)
}
```

#### On Logout

```typescript
import { handleAuthLogout } from '@/utils/authWidgetIntegration'

const handleLogout = async () => {
  // Clear app data
  await storage.removeItem('auth_token')

  // Clear widget data (iOS only)
  await handleAuthLogout()
}
```

### Player Integration

For new video/audio player screens:

```typescript
import { usePlaybackSync } from '@/hooks/useWidgetSync'

export default function MoviePlayerScreen() {
  const { position, duration } = useProgress()
  const playbackState = usePlaybackState()

  // Add this hook to any player screen
  usePlaybackSync(
    movieId,
    movie.title,
    'movie',
    movie.posterUrl,
    () => position,
    duration,
    playbackState === State.Playing
  )

  return <PlayerUI />
}
```

### Manual Progress Update

For custom playback scenarios:

```typescript
import { useWidgetSync } from '@/hooks/useWidgetSync'

export default function CustomPlayer() {
  const { updateWidgetProgress } = useWidgetSync()

  const handleProgressUpdate = async () => {
    await updateWidgetProgress({
      contentId: 'content-123',
      title: 'My Content',
      type: 'movie',
      coverUrl: 'https://...',
      position: 1800,
      duration: 7200,
    })
  }

  return <CustomPlayerUI />
}
```

## API Reference

### Hooks

#### `useWidgetSync()`

Returns widget sync functions for manual control.

```typescript
const {
  updateWidgetProgress,  // Update widget with progress
  shareAuthToken,        // Share auth token
  clearWidgetData,       // Clear widget data
} = useWidgetSync()
```

#### `usePlaybackSync()`

Automatically syncs playback progress at intervals.

```typescript
usePlaybackSync(
  contentId: string,
  title: string,
  type: 'movie' | 'series' | 'audiobook' | 'podcast',
  coverUrl: string | undefined,
  getCurrentPosition: () => number,
  duration: number,
  isPlaying: boolean
)
```

**Parameters:**
- `contentId` - Unique content identifier
- `title` - Display title
- `type` - Content type
- `coverUrl` - Cover image URL (optional)
- `getCurrentPosition` - Function that returns current position in seconds
- `duration` - Total duration in seconds
- `isPlaying` - Whether content is currently playing

**Behavior:**
- Updates widget every **30 seconds** while playing
- Updates on **component unmount** (when user exits)
- Only updates if position > **10 seconds**
- **iOS only** - no-op on Android

### Utility Functions

#### `handleAuthSuccess(token: string)`

Share auth token with widget after login.

```typescript
await handleAuthSuccess(firebaseToken)
```

#### `handleAuthLogout()`

Clear all widget data on logout.

```typescript
await handleAuthLogout()
```

#### `initializeWidgetOnLaunch()`

Initialize widget with stored auth token on app launch.

```typescript
await initializeWidgetOnLaunch()
```

#### `handleAppForeground()`

Refresh widget data when app comes to foreground.

```typescript
await handleAppForeground()
```

## Widget Service API

### `widgetService.shareAuthToken(token: string)`

Share auth token via App Groups.

```typescript
await widgetService.shareAuthToken(firebaseToken)
```

### `widgetService.shareContinueWatching(items: ContinueWatchingItem[])`

Share continue watching data via App Groups.

```typescript
await widgetService.shareContinueWatching([
  {
    id: 'content-123',
    title: 'My Movie',
    type: 'movie',
    coverUrl: 'https://...',
    duration: 7200,
    position: 1800,
  }
])
```

### `widgetService.updateContinueWatchingFromPlayback(...)`

Update single content item in continue watching.

```typescript
await widgetService.updateContinueWatchingFromPlayback(
  'content-123',
  'My Movie',
  'movie',
  'https://...',
  1800,
  7200
)
```

### `widgetService.clearWidgetData()`

Clear all widget data (auth token and continue watching).

```typescript
await widgetService.clearWidgetData()
```

## Data Flow

### Login Flow

```
1. User enters credentials
2. App authenticates with Firebase
3. App receives auth token
4. App calls handleAuthSuccess(token)
   ├─▶ Shares token to App Groups
   ├─▶ Fetches continue watching from API
   └─▶ Shares continue watching to App Groups
5. Widget can now make authenticated API requests
```

### Playback Flow

```
1. User starts playing content
2. usePlaybackSync hook activates
3. Every 30 seconds while playing:
   ├─▶ Gets current position from TrackPlayer
   ├─▶ Updates continue watching in App Groups
   └─▶ Widget refreshes on next timeline update
4. On player exit:
   └─▶ Final update with latest position
```

### Foreground Flow

```
1. App comes to foreground
2. AppState listener triggers
3. handleAppForeground() executes
   ├─▶ Fetches latest continue watching from API
   └─▶ Updates App Groups
4. Widget refreshes with latest data
```

## Platform Behavior

### iOS
- All widget sync functions execute normally
- Data shared via App Groups (`group.tv.bayit.app`)
- Widget updates automatically every 30 minutes
- Manual updates via App Groups trigger immediate timeline refresh

### Android
- All widget sync functions are **no-ops** (Platform.OS check)
- No App Groups on Android
- No performance impact

## Performance Considerations

### Update Frequency

- **Playback sync:** Every 30 seconds (only while playing)
- **Foreground refresh:** Once per app activation
- **Widget timeline:** Every 30 minutes (iOS managed)

### Throttling

The hooks implement automatic throttling:
- Position < 10 seconds: **No update**
- Not playing: **No update**
- Android: **No update**

### Network Usage

- Auth token: **~100 bytes** (one-time on login)
- Continue watching: **~2KB** per update
- Total per day: **<50KB** (typical usage)

## Debugging

### View Shared Data (iOS)

```swift
// In Xcode debug console
let sharedDefaults = UserDefaults(suiteName: "group.tv.bayit.app")
print("Auth token:", sharedDefaults?.string(forKey: "auth_token") ?? "nil")
print("Continue watching:", sharedDefaults?.string(forKey: "continue_watching") ?? "nil")
```

### Enable Debug Logging

The widget service uses the shared logger:

```typescript
import { log } from '@bayit/shared-services/logger.native'

// Logs automatically include:
// - "Widget: ..." prefix
// - Structured data (contentId, position, etc.)
// - Error details
```

### Common Issues

**Widget shows "No recent content"**
- Check if auth token is shared: `handleAuthSuccess()` called on login?
- Verify API endpoint returns data
- Check widget logs in Console.app

**Widget not updating**
- Verify `usePlaybackSync` is active
- Check position > 10 seconds
- Confirm playing state is true
- iOS limits widget refresh frequency

**Progress not saving**
- Ensure player exits properly (componentWillUnmount)
- Check TrackPlayer position is accurate
- Verify content ID matches backend

## Testing

### Test Widget Integration

```typescript
import { handleAuthSuccess } from '@/utils/authWidgetIntegration'

// Mock auth token
const testToken = 'test-token-123'

// Test sharing
await handleAuthSuccess(testToken)

// Verify in widget (check home screen)
```

### Test Playback Sync

```typescript
import { useWidgetSync } from '@/hooks/useWidgetSync'

const { updateWidgetProgress } = useWidgetSync()

// Manual update
await updateWidgetProgress({
  contentId: 'test-123',
  title: 'Test Movie',
  type: 'movie',
  coverUrl: undefined,
  position: 1800,
  duration: 7200,
})

// Check widget updates
```

## Best Practices

### ✅ DO

- Use `usePlaybackSync` for all player screens
- Call `handleAuthSuccess` after login
- Call `handleAuthLogout` on logout
- Let automatic integration handle most cases
- Check Platform.OS before manual calls (if not using hooks)

### ❌ DON'T

- Don't update widget more than once per 10 seconds
- Don't share auth token in plain text (use App Groups only)
- Don't update widget when position < 10 seconds
- Don't call widget functions on Android (hooks handle this)
- Don't block UI thread waiting for widget updates

## Migration

If migrating from a previous system:

```typescript
// OLD (custom sync logic)
const updateProgress = async () => {
  if (Platform.OS === 'ios') {
    await SharedGroupPreferences.setItem(...)
  }
}

// NEW (use hooks)
usePlaybackSync(
  contentId,
  title,
  type,
  coverUrl,
  () => position,
  duration,
  isPlaying
)
```

## Future Enhancements

Planned improvements:
- **Smart throttling** - Reduce updates when battery is low
- **Offline queue** - Buffer updates when offline
- **Widget refresh API** - Trigger immediate widget refresh
- **Analytics** - Track widget usage and engagement
