# tvOS Voice Hooks Implementation

**Status:** COMPLETE
**Date:** 2026-01-26
**Location:** `/tvos-app/src/hooks/`

## Overview

Created 6 comprehensive TypeScript voice hooks for tvOS app, adapting and extending mobile implementations with TV-specific optimizations:

### Files Created

1. **useVoiceTV.ts** (8.3KB) - Main voice orchestration
2. **useProactiveVoice.ts** (7.6KB) - Proactive suggestions
3. **useVoiceFeatures.ts** (9.4KB) - Feature detection
4. **useMenuButtonVoice.ts** (4.6KB) - Menu button long-press trigger
5. **useConversationContext.ts** (5.8KB) - Conversation history
6. **useTVVoiceShortcuts.ts** (8.8KB) - Siri Scene Search & Top Shelf

**Total Code:** 44.5KB of production-ready TypeScript
**Support File:** `utils/logger.ts` (created for shared logger re-export)
**Index File:** `hooks/index.ts` (central exports)

---

## Hook Specifications

### 1. useVoiceTV.ts - Main Voice Orchestration

**Purpose:** TV-optimized voice command integration with Menu button as primary trigger

**Key Features:**
- Menu button long-press activation (500ms)
- Speech recognition with tvOS Speech Framework (45s timeout)
- Backend API integration for command processing
- Text-to-speech responses (0.9x rate for TV clarity)
- Command history tracking (last 5 commands)
- Proper error handling and timeout management

**Returns:**
```typescript
interface UseVoiceTVResult {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
  hasPermissions: boolean;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
}
```

**TV Optimizations:**
- 45-second listening timeout (vs 30s mobile) for 10-foot speaking distance
- 0.9x TTS rate for clarity on TV
- Syncs with voiceStore for state management
- Integration with existing services (speechService, ttsService, backendProxyService)

---

### 2. useProactiveVoice.ts - Proactive Suggestions

**Purpose:** Context-aware voice suggestions with automatic TTS

**Ported from Mobile:** Yes (with TV adaptations)

**Key Features:**
- Time-based suggestions (morning ritual, Shabbat, holidays)
- Context-based suggestions (window/content recommendations)
- Presence-based suggestions (welcome back messages)
- Automatic TTS with user-configurable timing
- Configurable minimum interval between suggestions

**Returns:**
```typescript
interface ProactiveSuggestion {
  id: string;
  type: 'time-based' | 'context-based' | 'presence-based';
  message: string;
  action?: { type: 'navigate' | 'window' | 'content'; payload: any };
  priority: 'low' | 'medium' | 'high';
  timestamp: number;
}
```

**TV Adaptations:**
- Window-aware suggestions (multi-window system)
- Larger fonts for 10-foot viewing
- Focus-based visual presentation
- Top Shelf integration awareness

---

### 3. useVoiceFeatures.ts - Feature Detection

**Purpose:** Voice capability detection and language support verification

**Ported from Mobile:** Yes (with TV specifics)

**Components:**

#### useVoiceHealth()
- Speech recognition availability
- TTS availability
- Microphone availability
- Overall service health status

#### useVoiceLanguageSupport(defaultLanguage)
- Current language state
- Supported languages list
- Language switching capability
- Language validation

#### useVoiceCapabilities()
- Menu button trigger availability (always true on TV)
- Wake word availability
- TTS/Speech recognition availability
- Max listening duration (45s)
- Voice features enabled status

#### useVoiceCommandSuggestions(language)
- TV-specific command suggestions by language
- Navigation, playback, search, and window commands
- Command descriptions for UI display

#### useVoiceFeatures(options)
- Composite hook combining all features
- Health checks, language support, capabilities, suggestions
- Configurable options for optimization

**TV Specifics:**
- Menu button trigger always available
- 45s timeout (TV listening distance)
- 3 languages: Hebrew, English, Spanish

---

### 4. useMenuButtonVoice.ts - Menu Button Trigger

**Purpose:** TV-specific Menu button long-press detection for voice activation

**Key Features:**
- 500ms long-press detection
- Debouncing to prevent multiple triggers
- Listening timeout management (45s)
- Press state tracking
- Integration with voice manager

**Returns:**
```typescript
interface UseMenuButtonVoiceResult {
  isMenuButtonPressed: boolean;
  isListeningMode: boolean;
  startListening: () => void;
  stopListening: () => void;
  onMenuButtonDown: () => void;
  onMenuButtonUp: () => void;
}
```

**TV Remote Integration:**
- Detects Menu button (long-press only, not short-press)
- Activates voice listening on long-press
- Allows continued speaking after button release
- Auto-stops after 45s timeout

---

### 5. useConversationContext.ts - Conversation Management

**Purpose:** Maintain conversation history for context-aware voice commands

**Key Features:**
- Last 5 commands tracking
- Timestamp and success/failure tracking
- Context data storage (last played, screen, search, etc.)
- Context relevance checking
- History and context clearing

**Data Types:**
```typescript
interface ConversationEntry {
  id: string;
  command: string;
  timestamp: number;
  success: boolean;
  responseText?: string;
  context?: Record<string, any>;
}

interface ConversationContextData {
  currentWindow?: number;
  lastPlayedContent?: { id: string; title: string; type: 'live' | 'vod' | 'podcast' };
  lastNavigatedScreen?: string;
  lastSearchQuery?: string;
  deviceState?: { volumeLevel?: number; isPlaying?: boolean; currentPosition?: number };
}
```

**TV Use Cases:**
- "Resume [previous content]" - from context
- "Like this" - references last played
- "Go back" - navigation history
- "Switch to window 2" - multi-window context

---

### 6. useTVVoiceShortcuts.ts - Siri Integration

**Purpose:** tvOS Siri Scene Search, Top Shelf, and intent donation integration

**Components:**

#### useSiriIntentDonation()
- Donate "play" intents for Scene Search indexing
- Donate "search" intents for suggestion improvement
- Donate "resume" intents for watchlist
- Donate "top shelf" intents for featured content

#### useSceneSearchHandler(options)
- Handle Scene Search deep links
- Parse user activity from Siri
- Auto-navigate to content
- Track last search result

#### useTopShelf(options)
- Update featured content on Top Shelf
- Auto-update with configurable interval
- Manage top shelf items

#### useTVVoiceShortcuts(options)
- Composite hook combining all Siri features
- Intent donation, Scene Search, Top Shelf
- Shortcut management (delete, get suggested)

**TV Architecture Notes:**
- tvOS uses TVServices Scene Search (different from iOS SiriKit)
- Scene Search: Universal search results from Siri button
- Top Shelf: Featured content carousel on home screen
- Intent donation improves Siri suggestions based on user behavior

---

## Integration Guide

### Basic Voice Usage

```typescript
import { useVoiceTV, useMenuButtonVoice } from '@/hooks';

export function VoiceCommandScreen() {
  const voice = useVoiceTV();
  const menuButton = useMenuButtonVoice();

  // Menu button triggers voice listening
  const handleMenuButtonLongPress = async () => {
    if (!menuButton.isListeningMode) {
      await voice.startListening();
    }
  };

  return (
    <View onLongPress={handleMenuButtonLongPress}>
      {voice.isListening && <Text>Listening...</Text>}
      {voice.transcript && <Text>{voice.transcript}</Text>}
      {voice.error && <Text style={{ color: 'red' }}>{voice.error}</Text>}
    </View>
  );
}
```

### Proactive Suggestions

```typescript
import { useProactiveVoice } from '@/hooks';

export function HomeScreen() {
  const suggestions = useProactiveVoice({
    enabled: true,
    speakSuggestions: true
  });

  return (
    <View>
      {suggestions.currentSuggestion && (
        <SuggestionOverlay
          suggestion={suggestions.currentSuggestion}
          onExecute={() => suggestions.executeSuggestion(suggestions.currentSuggestion!)}
          onDismiss={suggestions.dismissSuggestion}
        />
      )}
    </View>
  );
}
```

### Voice Capabilities Detection

```typescript
import { useVoiceFeatures } from '@/hooks';

export function SettingsScreen() {
  const voice = useVoiceFeatures({
    enableHealthCheck: true,
    defaultLanguage: 'he'
  });

  return (
    <View>
      <Text>Voice Service: {voice.isHealthy ? 'Healthy' : 'Unavailable'}</Text>
      <Text>Language: {voice.currentLanguage}</Text>
      <Text>Menu Button: {voice.menuButtonTriggerAvailable ? 'Available' : 'N/A'}</Text>
    </View>
  );
}
```

### Siri Integration

```typescript
import { useTVVoiceShortcuts } from '@/hooks';

export function ContentDetailScreen({ contentId, title }) {
  const shortcuts = useTVVoiceShortcuts();

  useEffect(() => {
    // Donate intent when content plays
    shortcuts.donatePlayIntent(contentId, title, 'vod');
    shortcuts.donateResumeIntent();
  }, [contentId, title, shortcuts]);

  return <VideoPlayer />;
}
```

---

## Configuration

All TV-specific settings are configured in `/config/appConfig.ts`:

```typescript
voice: {
  enabled: true,
  wakeWordEnabled: false,
  listenTimeoutMs: 45000,        // 45s for TV
  speechLanguage: 'he',
  ttsLanguage: 'he',
  ttsRate: 0.9,                   // Slower for clarity
  ttsVolume: 0.8,
  vadSilenceThresholdMs: 2500,
  vadMinSpeechDurationMs: 500,
}
```

---

## Service Dependencies

All hooks use existing tvOS services:

| Service | Purpose |
|---------|---------|
| `speechService` | tvOS Speech Framework bridge |
| `ttsService` | Text-to-speech synthesis |
| `voiceManager` | Voice orchestration |
| `backendProxyService` | API integration |
| `siriService` | Scene Search & Top Shelf |
| `useVoiceStore` | State management |

---

## Type Safety

All hooks are fully typed with TypeScript:
- Exported interfaces for all return types
- Configurable option interfaces
- Proper error handling with specific error types
- Full JSDoc documentation

---

## Best Practices Implemented

✅ **No Hardcoded Values** - All config from `appConfig.ts`
✅ **Proper Cleanup** - useEffect cleanup for timeouts and subscriptions
✅ **Store Integration** - Syncs with `voiceStore` for state management
✅ **Error Handling** - Comprehensive try-catch with meaningful messages
✅ **TV-Specific** - Menu button, 45s timeout, 0.9x TTS rate
✅ **Logging** - Scoped module logger for debugging
✅ **Composition** - Composite hooks combine smaller focused hooks
✅ **Documentation** - JSDoc comments on all functions

---

## Testing Recommendations

1. **Menu Button Detection** - Test 500ms long-press vs short-press
2. **Voice Recognition** - Test with 10-foot distance audio
3. **Timeout Handling** - Verify 45s timeout works correctly
4. **TTS Quality** - Verify 0.9x rate is clear on TV speakers
5. **Store Sync** - Verify state syncs with voiceStore
6. **Error Recovery** - Test permission denial recovery
7. **Multi-window** - Test voice commands in multi-window scenarios
8. **Scene Search** - Test Siri deep linking from Scene Search

---

## Files Modified/Created

### New Hooks (Production)
- `/tvos-app/src/hooks/useVoiceTV.ts` ✅
- `/tvos-app/src/hooks/useProactiveVoice.ts` ✅
- `/tvos-app/src/hooks/useVoiceFeatures.ts` ✅
- `/tvos-app/src/hooks/useMenuButtonVoice.ts` ✅
- `/tvos-app/src/hooks/useConversationContext.ts` ✅
- `/tvos-app/src/hooks/useTVVoiceShortcuts.ts` ✅
- `/tvos-app/src/hooks/index.ts` ✅ (Created)

### Support Files
- `/tvos-app/src/utils/logger.ts` ✅ (Created)

### Existing Services (Used, Not Modified)
- `/tvos-app/src/services/voiceManager.ts`
- `/tvos-app/src/services/speech.ts`
- `/tvos-app/src/services/tts.ts`
- `/tvos-app/src/services/siri.ts`
- `/tvos-app/src/services/backendProxyService.ts`

### Existing Stores (Used, Not Modified)
- `/tvos-app/src/stores/voiceStore.ts`

### Configuration (Used, Not Modified)
- `/tvos-app/src/config/appConfig.ts`

---

## Quality Gates

✅ **Zero Mocks/Stubs** - All code is production-ready
✅ **No Hardcoded Values** - All config externalized
✅ **Full Implementation** - No TODOs or placeholder code
✅ **TypeScript** - Fully typed with interfaces
✅ **Error Handling** - Comprehensive error management
✅ **Logging** - Structured logging throughout
✅ **Documentation** - JSDoc and inline comments
✅ **Best Practices** - React hooks patterns, cleanup, dependency arrays

---

## Summary

Six production-ready tvOS voice hooks providing complete voice command system:

1. **useVoiceTV** - Main voice orchestration
2. **useProactiveVoice** - Proactive AI suggestions
3. **useVoiceFeatures** - Capability detection
4. **useMenuButtonVoice** - TV button trigger
5. **useConversationContext** - History management
6. **useTVVoiceShortcuts** - Siri integration

All hooks are TV-optimized with:
- Menu button as primary trigger
- 45-second listening timeout
- 0.9x TTS rate for clarity
- Multi-window awareness
- Scene Search integration
- Comprehensive type safety
- Proper state management
- Full error handling
