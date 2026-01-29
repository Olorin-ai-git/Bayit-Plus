# Voice API Reference

**Version**: 1.0.0
**Last Updated**: 2026-01-29
**Base URL**: `https://api.bayit.plus/api/v1`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Unified Voice Endpoint](#unified-voice-endpoint)
3. [Frontend Services](#frontend-services)
4. [Types and Interfaces](#types-and-interfaces)
5. [Error Codes](#error-codes)
6. [Rate Limits](#rate-limits)
7. [Examples](#examples)

---

## Authentication

All voice API endpoints require Firebase authentication.

### Headers

```http
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

### Getting Firebase Token

```typescript
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;
const token = await user.getIdToken();
```

---

## Unified Voice Endpoint

### POST /api/v1/voice/unified

Process a voice command with intent classification and routing.

#### Request

```http
POST /api/v1/voice/unified
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "transcript": "חפש סרטי פעולה",
  "language": "he",
  "conversation_id": "conv_abc123",
  "platform": "ios",
  "trigger_type": "wake-word"
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transcript` | string | ✅ Yes | Voice command transcription |
| `language` | string | ✅ Yes | Language code (`he`, `en`, `es`, etc.) |
| `conversation_id` | string | ❌ No | Conversation tracking ID (auto-generated if omitted) |
| `platform` | string | ✅ Yes | Platform: `web`, `ios`, `android`, `tvos` |
| `trigger_type` | string | ✅ Yes | Trigger: `manual`, `wake-word` |

#### Response

**Success (200 OK)**:
```json
{
  "intent": "SEARCH",
  "spoken_response": "מצאתי 15 סרטי פעולה",
  "action": {
    "type": "navigate",
    "route": "/search",
    "params": {
      "query": "פעולה",
      "genre": "action"
    }
  },
  "conversation_id": "conv_abc123",
  "confidence": 0.95,
  "gesture": {
    "type": "point",
    "duration": 2000
  }
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `intent` | VoiceIntent | Intent classification: `CHAT`, `SEARCH`, `NAVIGATION`, `PLAYBACK`, `SCROLL`, `CONTROL` |
| `spoken_response` | string | TTS response text (max 500 chars) |
| `action` | object | Action payload (optional) |
| `conversation_id` | string | Conversation tracking ID |
| `confidence` | number | Intent confidence score (0.0-1.0) |
| `gesture` | object | Avatar gesture state (optional) |

#### Intent Types

##### CHAT
Natural conversation with AI assistant.

**Example**:
```json
{
  "transcript": "מה זה סרט דוקומנטרי?",
  "language": "he",
  "platform": "web",
  "trigger_type": "manual"
}
```

**Response**:
```json
{
  "intent": "CHAT",
  "spoken_response": "סרט דוקומנטרי הוא סרט המציג עובדות על נושא מסוים",
  "confidence": 0.98,
  "gesture": {
    "type": "explain",
    "duration": 3000
  }
}
```

##### SEARCH
Content search queries.

**Example**:
```json
{
  "transcript": "חפש סרטים של כריסטופר נולן",
  "language": "he",
  "platform": "ios",
  "trigger_type": "wake-word"
}
```

**Response**:
```json
{
  "intent": "SEARCH",
  "spoken_response": "מצאתי 12 סרטים של כריסטופר נולן",
  "action": {
    "type": "navigate",
    "route": "/search",
    "params": {
      "query": "Christopher Nolan"
    }
  },
  "confidence": 0.93
}
```

##### NAVIGATION
App navigation commands.

**Example**:
```json
{
  "transcript": "עבור למועדפים",
  "language": "he",
  "platform": "tvos",
  "trigger_type": "manual"
}
```

**Response**:
```json
{
  "intent": "NAVIGATION",
  "spoken_response": "עובר למועדפים שלך",
  "action": {
    "type": "navigate",
    "route": "/favorites"
  },
  "confidence": 0.97
}
```

##### PLAYBACK
Media playback controls.

**Example**:
```json
{
  "transcript": "נגן את פאודה",
  "language": "he",
  "platform": "android",
  "trigger_type": "wake-word"
}
```

**Response**:
```json
{
  "intent": "PLAYBACK",
  "spoken_response": "מנגן את פאודה",
  "action": {
    "type": "play",
    "content_id": "series_fauda_123",
    "episode": 1,
    "season": 1
  },
  "confidence": 0.96
}
```

##### SCROLL
Screen scrolling commands.

**Example**:
```json
{
  "transcript": "גלול למטה",
  "language": "he",
  "platform": "web",
  "trigger_type": "manual"
}
```

**Response**:
```json
{
  "intent": "SCROLL",
  "spoken_response": "גולל למטה",
  "action": {
    "type": "scroll",
    "direction": "down",
    "amount": 500
  },
  "confidence": 0.99
}
```

##### CONTROL
System control commands.

**Example**:
```json
{
  "transcript": "סגור חלון",
  "language": "he",
  "platform": "ios",
  "trigger_type": "manual"
}
```

**Response**:
```json
{
  "intent": "CONTROL",
  "spoken_response": "סוגר חלון",
  "action": {
    "type": "close",
    "target": "modal"
  },
  "confidence": 0.95
}
```

#### Error Responses

**Authentication Error (401)**:
```json
{
  "detail": "Invalid authentication token",
  "error_code": "AUTH_INVALID_TOKEN"
}
```

**Rate Limit Error (429)**:
```json
{
  "detail": "Rate limit exceeded. Try again in 60 seconds",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 60
}
```

**Server Error (500)**:
```json
{
  "detail": "Voice command processing failed",
  "error_code": "INTERNAL_SERVER_ERROR"
}
```

---

## Frontend Services

### OlorinVoiceOrchestrator

Main orchestrator service for all voice interactions.

#### Import

```typescript
import { createVoiceOrchestrator } from '@bayit/shared/services/olorinVoiceOrchestrator';
import type { VoiceConfig, VoiceCommandResponse } from '@bayit/shared/types/voiceAvatar';
```

#### Methods

##### initialize(config?: Partial<VoiceConfig>): Promise<void>

Initialize the orchestrator with configuration.

**Example**:
```typescript
const orchestrator = createVoiceOrchestrator({
  platform: 'web',
  language: 'he',
  wakeWordEnabled: false,
  streamingMode: true,
  initialAvatarMode: 'full',
  autoExpandOnWakeWord: true,
  collapseDelay: 5000,
});

await orchestrator.initialize();
```

##### startListening(trigger: VoiceTrigger): Promise<void>

Start listening for voice input.

**Parameters**:
- `trigger`: `'manual'` | `'wake-word'`

**Example**:
```typescript
// Manual trigger (button press)
await orchestrator.startListening('manual');

// Wake word trigger
await orchestrator.startListening('wake-word');
```

##### stopListening(): Promise<void>

Stop listening for voice input.

**Example**:
```typescript
await orchestrator.stopListening();
```

##### interrupt(): Promise<void>

Interrupt current voice processing.

**Example**:
```typescript
await orchestrator.interrupt();
```

##### processTranscript(transcript: string, conversationId?: string): Promise<VoiceCommandResponse>

Process a voice transcript and get response.

**Example**:
```typescript
const response = await orchestrator.processTranscript(
  'חפש סרטים',
  'conv_abc123' // optional
);

console.log(response.intent);           // 'SEARCH'
console.log(response.spokenResponse);   // 'מחפש סרטים...'
console.log(response.confidence);       // 0.95
```

##### setAvatarVisibility(mode: AvatarMode): void

Change avatar visibility mode.

**Example**:
```typescript
orchestrator.setAvatarVisibility('compact');
```

##### setWakeWordEnabled(enabled: boolean): void

Enable/disable wake word detection.

**Example**:
```typescript
orchestrator.setWakeWordEnabled(true);
```

##### setStreamingMode(enabled: boolean): void

Enable/disable streaming mode.

**Example**:
```typescript
orchestrator.setStreamingMode(false); // Use batch mode
```

---

### useVoiceOrchestrator Hook

React hook for voice orchestrator integration.

#### Import

```typescript
import { useVoiceOrchestrator } from '@bayit/shared/hooks/useVoiceOrchestrator';
```

#### Usage

```typescript
function VoiceFeature() {
  const {
    orchestrator,
    isInitialized,
    startListening,
    stopListening,
    interrupt,
    processTranscript,
  } = useVoiceOrchestrator({
    platform: 'web',
    language: 'he',
    wakeWordEnabled: false,
  });

  const handleVoiceCommand = async () => {
    await startListening('manual');
  };

  return (
    <button onClick={handleVoiceCommand} disabled={!isInitialized}>
      Start Voice
    </button>
  );
}
```

#### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `orchestrator` | OlorinVoiceOrchestrator \| null | Orchestrator instance |
| `isInitialized` | boolean | Initialization status |
| `startListening` | (trigger: VoiceTrigger) => Promise<void> | Start listening |
| `stopListening` | () => Promise<void> | Stop listening |
| `interrupt` | () => Promise<void> | Interrupt processing |
| `processTranscript` | (transcript: string, convId?: string) => Promise<VoiceCommandResponse> | Process transcript |

---

### useVoiceAvatarMode Hook

React hook for avatar mode management.

#### Import

```typescript
import { useVoiceAvatarMode } from '@bayit/shared/hooks/useVoiceAvatarMode';
```

#### Usage

```typescript
function AvatarDisplay() {
  const {
    avatarMode,
    dimensions,
    showAnimations,
    showWaveform,
    showTranscript,
    showWizard,
  } = useVoiceAvatarMode('web');

  return (
    <View style={{ width: dimensions.web.width, height: dimensions.web.height }}>
      {showWizard && <WizardAvatar />}
      {showWaveform && <Waveform />}
      {showTranscript && <Transcript />}
    </View>
  );
}
```

#### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `avatarMode` | AvatarMode | Current mode: `full`, `compact`, `minimal`, `icon_only` |
| `dimensions` | Dimensions | Platform-specific dimensions |
| `showAnimations` | boolean | Show animations flag |
| `showWaveform` | boolean | Show waveform flag |
| `showTranscript` | boolean | Show transcript flag |
| `showWizard` | boolean | Show wizard flag |

---

## Types and Interfaces

### VoiceIntent

```typescript
export type VoiceIntent =
  | 'CHAT'        // Natural conversation
  | 'SEARCH'      // Content search
  | 'NAVIGATION'  // App navigation
  | 'PLAYBACK'    // Media controls
  | 'SCROLL'      // Screen scrolling
  | 'CONTROL';    // System controls
```

### AvatarMode

```typescript
export type AvatarMode =
  | 'full'        // Complete wizard with animations
  | 'compact'     // Floating circular panel
  | 'minimal'     // Waveform bar only
  | 'icon_only';  // Hidden (FAB only)
```

### VoiceTrigger

```typescript
export type VoiceTrigger =
  | 'manual'      // Button press
  | 'wake-word';  // Wake word detected
```

### VoiceConfig

```typescript
export interface VoiceConfig {
  platform: 'web' | 'ios' | 'android' | 'tvos';
  language: string;              // Language code
  wakeWordEnabled: boolean;      // Enable wake word detection
  streamingMode: boolean;        // Use streaming (faster) vs batch
  initialAvatarMode: AvatarMode; // Starting mode
  autoExpandOnWakeWord: boolean; // Auto-expand on wake word
  collapseDelay: number;         // Auto-collapse delay (ms)
}
```

### VoiceCommandResponse

```typescript
export interface VoiceCommandResponse {
  intent: VoiceIntent;
  spokenResponse: string;
  action?: {
    type: string;
    [key: string]: any;
  };
  conversationId: string;
  confidence: number;
  gesture?: {
    type: string;
    duration: number;
  };
}
```

### AvatarModeConfig

```typescript
export interface AvatarModeConfig {
  dimensions: {
    web: { width: number; height: number };
    mobile: { width: number; height: number };
    tv: { width: number; height: number };
  };
  showAnimations: boolean;
  showWaveform: boolean;
  showTranscript: boolean;
  showWizard: boolean;
}
```

---

## Error Codes

### Authentication Errors (401)

| Code | Description | Solution |
|------|-------------|----------|
| `AUTH_MISSING_TOKEN` | No authentication token provided | Include Authorization header |
| `AUTH_INVALID_TOKEN` | Invalid or expired token | Get new Firebase token |
| `AUTH_USER_NOT_FOUND` | User not found | Ensure user is registered |

### Validation Errors (400)

| Code | Description | Solution |
|------|-------------|----------|
| `VALIDATION_TRANSCRIPT_EMPTY` | Empty transcript | Provide non-empty transcript |
| `VALIDATION_LANGUAGE_INVALID` | Invalid language code | Use valid language code |
| `VALIDATION_PLATFORM_INVALID` | Invalid platform | Use: web, ios, android, tvos |

### Rate Limit Errors (429)

| Code | Description | Solution |
|------|-------------|----------|
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded | Wait and retry (retry_after) |
| `RATE_LIMIT_USER` | User-specific limit | Wait 60 seconds |
| `RATE_LIMIT_IP` | IP-based limit | Wait 60 seconds |

### Server Errors (500)

| Code | Description | Solution |
|------|-------------|----------|
| `INTERNAL_SERVER_ERROR` | Unexpected server error | Retry with exponential backoff |
| `INTENT_CLASSIFICATION_FAILED` | Intent classification failed | Check transcript clarity |
| `HANDLER_EXECUTION_FAILED` | Handler execution failed | Contact support |

---

## Rate Limits

### Rate Limit Tiers

| User Type | Per Minute | Per Hour | Per Day |
|-----------|------------|----------|---------|
| **Free** | 10 | 50 | 200 |
| **Premium** | 60 | 500 | 2000 |
| **Admin** | 120 | 1000 | 5000 |

### Rate Limit Headers

All responses include rate limit headers:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1706544000
```

### Handling Rate Limits

```typescript
async function sendVoiceCommand(transcript: string) {
  try {
    const response = await fetch('/api/v1/voice/unified', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript, language: 'he', platform: 'web', trigger_type: 'manual' }),
    });

    if (response.status === 429) {
      const data = await response.json();
      console.log(`Rate limited. Retry after ${data.retry_after} seconds`);
      await new Promise(resolve => setTimeout(resolve, data.retry_after * 1000));
      return sendVoiceCommand(transcript); // Retry
    }

    return response.json();
  } catch (error) {
    console.error('Voice command failed:', error);
    throw error;
  }
}
```

---

## Examples

### Example 1: Basic Voice Search (Web)

```typescript
import { useVoiceOrchestrator } from '@bayit/shared/hooks/useVoiceOrchestrator';
import { useSupportStore } from '@bayit/shared/stores/supportStore';

function SearchComponent() {
  const { processTranscript } = useVoiceOrchestrator({ platform: 'web' });
  const [results, setResults] = useState([]);

  const handleVoiceSearch = async (transcript: string) => {
    const response = await processTranscript(transcript);

    if (response.intent === 'SEARCH' && response.action) {
      // Navigate to search results
      router.push({
        pathname: response.action.route,
        query: response.action.params,
      });
    }
  };

  return (
    <div>
      <button onClick={() => handleVoiceSearch('חפש סרטים')}>
        Voice Search
      </button>
    </div>
  );
}
```

### Example 2: Wake Word Detection (Mobile)

```typescript
// In voiceManager initialization
private async _initializeOrchestrator(): Promise<void> {
  this.orchestrator = createVoiceOrchestrator({
    platform: 'ios',
    language: 'he',
    wakeWordEnabled: true,
    autoExpandOnWakeWord: true,
  });
  await this.orchestrator.initialize();
}

// Wake word detection handler
private async _onWakeWordDetected(detection: any): Promise<void> {
  if (this.orchestrator) {
    await this.orchestrator.startListening('wake-word');
  }

  // Update UI
  const store = useSupportStore.getState();
  store.onWakeWordDetected();

  // Haptic feedback
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}
```

### Example 3: Avatar Mode Switching

```typescript
import { useSupportStore } from '@bayit/shared/stores/supportStore';

function AvatarSettings() {
  const { avatarVisibilityMode, setAvatarVisibilityMode } = useSupportStore();

  const modes = ['full', 'compact', 'minimal', 'icon_only'] as const;

  return (
    <div>
      {modes.map((mode) => (
        <button
          key={mode}
          onClick={() => setAvatarVisibilityMode(mode)}
          className={avatarVisibilityMode === mode ? 'selected' : ''}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}
```

### Example 4: Streaming vs Batch Mode

```typescript
import { useVoiceOrchestrator } from '@bayit/shared/hooks/useVoiceOrchestrator';

function VoiceComponent() {
  const { orchestrator } = useVoiceOrchestrator({ platform: 'web' });

  const handleQuickCommand = async () => {
    // Use streaming for fast responses
    orchestrator?.setStreamingMode(true);
    await orchestrator?.processTranscript('play next episode');
  };

  const handleComplexQuery = async () => {
    // Use batch for complex processing
    orchestrator?.setStreamingMode(false);
    await orchestrator?.processTranscript('recommend movies similar to inception');
  };

  return (
    <div>
      <button onClick={handleQuickCommand}>Quick Command</button>
      <button onClick={handleComplexQuery}>Complex Query</button>
    </div>
  );
}
```

### Example 5: Error Handling

```typescript
async function processVoiceCommand(transcript: string) {
  try {
    const response = await orchestrator.processTranscript(transcript);
    return response;
  } catch (error) {
    if (error.status === 401) {
      // Re-authenticate
      const newToken = await refreshFirebaseToken();
      return processVoiceCommand(transcript); // Retry
    } else if (error.status === 429) {
      // Rate limited
      const retryAfter = error.retry_after || 60;
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return processVoiceCommand(transcript); // Retry
    } else {
      // Show error to user
      toast.error('Voice command failed. Please try again.');
      throw error;
    }
  }
}
```

---

## Related Documentation

- [Unified Voice Architecture](../architecture/UNIFIED_VOICE_ARCHITECTURE.md)
- [Voice Migration Guide](../guides/VOICE_MIGRATION_GUIDE.md)
- [Authentication Guide](../security/AUTHENTICATION.md)
- [Rate Limiting Guide](../operations/RATE_LIMITING.md)

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-29
**Maintained By**: Platform Team
**Review Cycle**: Quarterly
