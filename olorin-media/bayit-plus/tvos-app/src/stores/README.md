# tvOS Stores

Zustand state management for tvOS app. Adapted from mobile PiP patterns with TV-specific optimizations.

## Stores

### 1. Multi-Window Store (`multiWindowStore.ts`)

Multi-window system for TV, adapted from mobile PiP widget store.

**Key Differences from Mobile:**
- Max 4 concurrent windows (vs 2 for mobile)
- Focus-based navigation (no drag/snap)
- TV-specific layouts: `grid2x2`, `sidebar3`, `fullscreen`
- Focus state tracking: `focusedWindowId`, `expandedWindowId`
- Directional navigation: `navigateFocus(direction)`
- TV remote gesture support

**API Compatibility:**
- Backend endpoints: `/widgets/system`, `/widgets/personal/:userId`
- Window type maps to mobile Widget type
- Position, content types identical to mobile

**Usage:**

```typescript
import { useMultiWindowStore, useWindow } from '@/stores';

// In a component
function TVWindowManager() {
  const windows = useMultiWindowStore((state) => state.getVisibleWindows());
  const layoutMode = useMultiWindowStore((state) => state.layoutMode);
  const focusedWindowId = useMultiWindowStore((state) => state.focusedWindowId);
  const navigateFocus = useMultiWindowStore((state) => state.navigateFocus);
  const setLayoutMode = useMultiWindowStore((state) => state.setLayoutMode);

  // Handle Siri Remote navigation
  const handleRemotePress = (direction: 'up' | 'down' | 'left' | 'right') => {
    navigateFocus(direction);
  };

  // Switch layout
  const switchToGrid = () => setLayoutMode('grid2x2');

  return (
    <View>
      {windows.map((window) => (
        <WindowComponent key={window.id} windowId={window.id} />
      ))}
    </View>
  );
}

// Single window hook
function WindowComponent({ windowId }: { windowId: string }) {
  const windowData = useWindow(windowId);

  if (!windowData) return null;

  const { window, isFocused, isExpanded, toggleMute, close, expand } = windowData;

  return (
    <View style={{ opacity: isFocused ? 1 : 0.7 }}>
      <Text>{window.title}</Text>
      <Button onPress={toggleMute}>
        {windowData.isMuted ? 'Unmute' : 'Mute'}
      </Button>
    </View>
  );
}
```

**Persistence:**
- Persisted: `localState`, `activeAudioWindow`, `layoutMode`
- Ephemeral: `focusedWindowId`, `expandedWindowId` (per-session)
- Storage: AsyncStorage (key: `bayit-tv-multiwindow-store`)

**Layouts:**

| Layout | Description | Max Windows |
|--------|-------------|-------------|
| `grid2x2` | 2x2 grid layout | 4 |
| `sidebar3` | 1 large + 3 sidebar | 4 |
| `fullscreen` | Single expanded window | 1 |

**Window States:**
- `full` - Normal window state
- `minimized` - Minimized to icon/thumbnail
- `expanded` - Expanded to fullscreen (sets `expandedWindowId`)

**Audio Management:**
- Only one audio window active at a time (same as mobile)
- `setActiveAudio(windowId)` - Switch audio source
- Auto-clears when closing active audio window

---

### 2. Voice Store (`voiceStore.ts`)

Voice system state management for TV-optimized voice commands.

**Features:**
- Voice session lifecycle tracking
- Real-time transcription state
- Command history (last 5 commands)
- Session metrics for analytics
- Error handling with recovery hints
- Audio ducking state (for TTS feedback)
- Wake word detection state (TV-specific)
- Menu button long-press activation (TV-specific)

**Usage:**

```typescript
import { useVoiceStore, useVoiceSession, useAudioDucking } from '@/stores';

// Voice session management
function VoiceButton() {
  const {
    isListening,
    isProcessing,
    currentTranscription,
    lastCommand,
    error,
    startListening,
    stopListening,
  } = useVoiceSession();

  const handleMenuButtonPress = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening('menu-button');
    }
  };

  return (
    <View>
      <Text>{isListening ? 'Listening...' : 'Press Menu to speak'}</Text>
      {currentTranscription && <Text>{currentTranscription}</Text>}
      {error && <Text style={{ color: 'red' }}>{error.message}</Text>}
    </View>
  );
}

// Audio ducking (for TTS playback)
function TTSPlayer() {
  const { isAudioDucked, setAudioDucked } = useAudioDucking();

  const playTTS = async (text: string) => {
    setAudioDucked(true); // Duck media audio
    await speakText(text);
    setAudioDucked(false); // Restore media audio
  };

  return <View />;
}

// Wake word detection (optional TV feature)
function WakeWordDetector() {
  const { isWakeWordActive, setWakeWordActive } = useWakeWord();

  useEffect(() => {
    if (isWakeWordActive) {
      // Start wake word detection
      startWakeWordDetection();
    } else {
      stopWakeWordDetection();
    }
  }, [isWakeWordActive]);

  return null;
}
```

**Session Lifecycle:**

1. **Start Session**: `startListening(trigger)`
   - Triggers: `menu-button`, `wake-word`, `manual`
   - Creates session ID, starts metrics tracking

2. **Active Session**: `isListening` or `isProcessing`
   - `setTranscription(text)` - Update real-time transcription
   - `setProcessing(true)` - Mark command processing

3. **End Session**: `endSession(success)`
   - Finalizes metrics (duration, success status)
   - Clears transient state

**Error Handling:**

```typescript
const setError = useVoiceStore((state) => state.setError);

// Set recoverable error
setError({
  type: 'command_not_understood',
  message: 'Could not understand command. Please try again.',
  timestamp: Date.now(),
  recoverable: true,
});

// Set non-recoverable error
setError({
  type: 'microphone_unavailable',
  message: 'Microphone access denied. Enable in Settings.',
  timestamp: Date.now(),
  recoverable: false,
});
```

**Error Types:**
- `microphone_permission` - User denied microphone access
- `microphone_unavailable` - Hardware not available
- `network_error` - Network connectivity issues
- `recognition_failed` - Speech recognition failed
- `command_not_understood` - Command not recognized
- `execution_failed` - Command understood but execution failed
- `timeout` - Session timeout
- `unknown` - Unexpected error

**Persistence:**
- No persistence (all state ephemeral)
- Voice sessions are transient per-session
- Command history cleared on app restart

**Session Metrics:**

```typescript
interface VoiceSessionMetrics {
  sessionId: string;           // Unique session ID
  startTime: number;            // Session start timestamp
  endTime?: number;             // Session end timestamp
  durationMs?: number;          // Total session duration
  wordsDetected: number;        // Number of words detected
  confidenceAvg: number;        // Average confidence score
  silenceDurationMs: number;    // Total silence duration
  interruptions: number;        // Number of interruptions
  commandType?: string;         // Type of command executed
  successfulExecution: boolean; // Whether command succeeded
}
```

---

## Integration with Mobile Pattern

Both stores maintain API compatibility with mobile-app patterns:

**Multi-Window Store:**
- Uses same backend endpoints as mobile widgets
- `Window` type maps to mobile `Widget` type
- Position and content structures identical
- AsyncStorage persistence strategy same as mobile

**Differences for TV:**
- 4 concurrent windows (vs 2 mobile)
- Focus navigation (vs drag/snap)
- TV layouts (grid2x2, sidebar3, fullscreen)
- No touch gestures - Siri Remote navigation

**Voice Store:**
- New for tvOS (mobile uses microphone differently)
- TV-optimized timeouts (45s vs 30s mobile)
- Menu button as primary trigger
- Optional wake word detection
- Audio ducking for 10-foot experience

---

## Configuration

Stores use configuration from `config/appConfig.ts`:

```typescript
// Multi-window settings
config.tv.maxConcurrentWindows = 4;
config.tv.focusNavigation = true;

// Voice settings
config.voice.enabled = true;
config.voice.listenTimeoutMs = 45000; // 45s for TV
config.voice.vadSensitivity = 'medium';
```

---

## Testing

```bash
# Test stores
npm test stores/multiWindowStore.test.ts
npm test stores/voiceStore.test.ts

# Test integration with components
npm test integration/multiWindow.test.ts
npm test integration/voice.test.ts
```

---

## Backend Integration

### Multi-Window Store

**Fetch system windows:**
```typescript
const response = await fetch(`${API_BASE_URL}/widgets/system`);
const systemWindows = await response.json();
useMultiWindowStore.getState().setWindows(systemWindows);
```

**Fetch personal windows:**
```typescript
const response = await fetch(`${API_BASE_URL}/widgets/personal/${userId}`);
const personalWindows = await response.json();
useMultiWindowStore.getState().setWindows(personalWindows);
```

### Voice Store

Voice store is purely client-side state management. Backend integration happens through:
- Voice command API: Send transcription, receive command intent
- TTS API: Text-to-speech for voice responses
- Analytics API: Send session metrics

---

## Performance

**Multi-Window Store:**
- Selective re-renders with Zustand selectors
- Only persist local state (not full window data)
- Efficient focus navigation (O(1) lookups)

**Voice Store:**
- No persistence overhead (ephemeral)
- Lightweight command history (max 5 entries)
- Metrics tracking has negligible impact

---

## Future Enhancements

**Multi-Window Store:**
- [ ] Layout persistence per user
- [ ] Window arrangement presets
- [ ] Smart focus prediction (ML-based)
- [ ] Gesture-based layout switching

**Voice Store:**
- [ ] Voice command templates/shortcuts
- [ ] Multi-language command routing
- [ ] Voice biometric authentication
- [ ] Contextual command suggestions
