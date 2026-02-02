# Wizard Voice Integration Guide

## Overview

The Wizard voice feature integrates Claude AI-powered voice interactions with the Bayit+ platform, supporting Hebrew, English, and Spanish.

## Architecture

```
User Voice Input
   ↓
useWizardVoice Hook (web/src/hooks/useWizardVoice.ts)
   ├─ MediaRecorder (audio capture)
   ├─ POST /api/v1/support/transcribe (STT)
   └─ wizardService.sendVoiceCommand()
       ↓
POST /api/v1/voice/unified (Wizard Backend)
   ├─ Claude API (Haiku 4.5)
   ├─ 5 Tools (search, recommendations, live, kids, guide)
   ├─ Intent Classification
   └─ Multi-language Processing
       ↓
Response: { intent, spoken_response, action, gesture, conversation_id, confidence }
   ↓
   ├─ TTS (spoken_response)
   ├─ Gesture Animation (gesture state)
   └─ Action Handler (wizardActionHandler.ts)
       ├─ navigate
       ├─ search
       ├─ play
       ├─ scroll
       ├─ control
       └─ kids_content
```

## Components

### 1. useWizardVoice Hook (`web/src/hooks/useWizardVoice.ts`)

**Purpose**: Web-specific voice recording + wizard backend integration

**Usage**:
```tsx
import { useWizardVoice } from '@/hooks/useWizardVoice';

function VoiceComponent() {
  const {
    isRecording,
    isProcessing,
    isSpeaking,
    currentTranscript,
    lastResponse,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    resetConversation,
  } = useWizardVoice();

  return (
    <div>
      {isRecording && <p>Listening...</p>}
      {isProcessing && <p>Processing: {currentTranscript}</p>}
      {isSpeaking && <p>Speaking: {lastResponse}</p>}
      {error && <p>Error: {error}</p>}

      <button onClick={startRecording} disabled={isRecording || isProcessing}>
        Start Recording
      </button>
      <button onClick={stopRecording} disabled={!isRecording}>
        Stop Recording
      </button>
    </div>
  );
}
```

### 2. wizardService (`web/src/services/wizardService.ts`)

**Purpose**: API client for wizard backend (uses centralized API)

**Usage**:
```typescript
import { sendVoiceCommand } from '@/services/wizardService';

const response = await sendVoiceCommand({
  transcript: "Find me a comedy movie",
  language: "en", // or "he", "es"
  platform: "web",
  trigger_type: "manual"
});

// response: {
//   intent: "SEARCH",
//   spoken_response: "I found several comedy movies for you",
//   action: { type: "search", payload: { results: [...] } },
//   gesture: { gesture: "presenting", duration: 2000 },
//   conversation_id: "conv_123",
//   confidence: 0.95
// }
```

### 3. Wizard Action Handler (`web/src/services/wizardActionHandler.ts`)

**Purpose**: Processes actions from wizard backend

**Setup**: Already auto-initialized in `App.tsx`

**Supported Actions**:

| Action Type | Payload | Behavior |
|-------------|---------|----------|
| `navigate` | `{ route, params }` | Navigate to route with query params |
| `search` | `{ query, results }` | Navigate to search page with results |
| `play` | `{ content_id, content_type, timestamp }` | Play content (VOD, live, radio, podcast, audiobook) |
| `scroll` | `{ direction, target }` | Scroll page up/down or to element |
| `control` | `{ command, value }` | Media controls (pause, play, volume) |
| `kids_content` | `{ items }` | Navigate to kids section |

**Custom Event Listener**:
```typescript
window.addEventListener('wizard:action', (event: CustomEvent) => {
  const { type, payload } = event.detail;
  console.log('Wizard action:', type, payload);
});
```

## Integration with Existing Components

### Option A: Replace Voice Support Service (Recommended for New Implementation)

Create a new wizard-specific voice modal:

```tsx
import { useWizardVoice } from '@/hooks/useWizardVoice';
import { RemotionWizard } from '@/components/wizard/RemotionWizard';
import { useSupportStore } from '@bayit/shared/stores/supportStore';

export function WizardVoiceModal({ visible, onClose }: Props) {
  const {
    isRecording,
    isProcessing,
    currentTranscript,
    lastResponse,
    startRecording,
    stopRecording,
  } = useWizardVoice();

  const { gestureState } = useSupportStore();

  return (
    <Modal visible={visible} onClose={onClose}>
      {/* Wizard Avatar with Gesture Animation */}
      <RemotionWizard />

      {/* Voice State Display */}
      {isRecording && <p>Listening: {currentTranscript}</p>}
      {isProcessing && <p>Thinking...</p>}
      {lastResponse && <p>{lastResponse}</p>}

      {/* Controls */}
      <button onClick={startRecording}>Start</button>
      <button onClick={stopRecording}>Stop</button>
    </Modal>
  );
}
```

### Option B: Extend Existing VoiceChatModal

Add wizard backend as an option to existing voice modal:

```tsx
// In VoiceChatModal.tsx
import { useWizardVoice } from '@/hooks/useWizardVoice';

// Add prop to switch between support and wizard modes
interface Props {
  mode?: 'support' | 'wizard'; // default: 'support'
  // ... other props
}

// Use useWizardVoice when mode === 'wizard'
const wizardVoice = useWizardVoice();

// Switch between voice support service and wizard based on mode
```

## Testing

### Manual Testing Checklist

#### Hebrew (he)
- [ ] Record: "מצא לי סרט קומדיה" (Find me a comedy movie)
- [ ] Expected: Hebrew response + search action
- [ ] Gesture: "presenting" or "browsing"

#### English (en)
- [ ] Record: "Play the latest episode of my favorite podcast"
- [ ] Expected: English response + play action
- [ ] Gesture: "presenting"

#### Spanish (es)
- [ ] Record: "Muéstrame contenido para niños" (Show me kids content)
- [ ] Expected: Spanish response + kids_content action
- [ ] Gesture: "greeting" or "presenting"

### Unit Testing

```typescript
import { renderHook, act } from '@testing-library/react';
import { useWizardVoice } from '@/hooks/useWizardVoice';

test('starts and stops recording', async () => {
  const { result } = renderHook(() => useWizardVoice());

  await act(async () => {
    await result.current.startRecording();
  });

  expect(result.current.isRecording).toBe(true);

  await act(async () => {
    await result.current.stopRecording();
  });

  expect(result.current.isRecording).toBe(false);
});
```

## Backend API

### Endpoint: POST /api/v1/voice/unified

**Request**:
```json
{
  "transcript": "Find me a comedy movie",
  "language": "en",
  "conversation_id": "optional-conv-id",
  "platform": "web",
  "trigger_type": "manual"
}
```

**Response**:
```json
{
  "intent": "SEARCH",
  "spoken_response": "I found several comedy movies for you",
  "action": {
    "type": "search",
    "payload": {
      "query": "comedy",
      "results": [...]
    }
  },
  "gesture": {
    "gesture": "presenting",
    "duration": 2000
  },
  "conversation_id": "conv_abc123",
  "confidence": 0.95
}
```

## Gesture States

Available gestures for wizard avatar animation:

- `idle` - Default state
- `greeting` - Waving hello
- `listening` - Attentive, ears up
- `thinking` - Processing, pondering
- `presenting` - Showing results
- `conjuring` - Magic, searching
- `browsing` - Looking through options
- `confused` - Didn't understand
- `shrugging` - No results
- `farewell` - Goodbye wave
- `cheering` - Success, celebration
- `clapping` - Applause
- `crying` - Error, sad
- `facepalm` - Mistake
- `success` - Task completed

## Troubleshooting

### Issue: "Microphone permission denied"
**Solution**: Request permission in settings or browser

### Issue: "Transcription failed"
**Solution**: Check `/api/v1/support/transcribe` endpoint is accessible

### Issue: "Wizard backend failed"
**Solution**: Check `/api/v1/voice/unified` endpoint and backend logs

### Issue: "Actions not executing"
**Solution**: Check browser console for wizard:action events and action handler errors

### Issue: "Gesture not animating"
**Solution**: Verify RemotionWizard component is rendered and gesture state is updated in supportStore

## Performance Optimization

- **Audio Recording**: 250ms chunks for responsive transcription
- **Minimum Audio Size**: 1000 bytes to avoid empty recordings
- **Conversation Context**: Preserved via conversation_id for multi-turn conversations
- **Error Recovery**: 3-second error display then auto-reset to idle

## Security

- **Authentication**: Uses centralized API with auto-injected auth tokens
- **CORS**: Backend validates origin headers
- **Rate Limiting**: 60 requests/minute per user on /api/v1/voice/unified
- **Input Validation**: Transcript max 500 characters, validated by backend

## Next Steps

1. Integrate useWizardVoice into existing VoiceChatModal or create new wizard modal
2. Test all 3 languages (Hebrew, English, Spanish)
3. Verify gesture animations display correctly
4. Test all action types (navigate, search, play, scroll, control, kids_content)
5. Monitor wizard backend logs for errors and performance
6. Collect user feedback on response quality and accuracy
