# @bayit/shared-voice-services

Shared voice services for the Bayit+ streaming platform. Provides cross-platform voice processing, emotional intelligence, conversation management, and analytics.

## Features

- **Emotional Intelligence**: Analyze user frustration and adapt TTS responses
- **Voice Processing**: Intent detection and command processing
- **Conversation Context**: Session management and conversation history
- **Analytics**: Track voice interaction metrics and performance

## Installation

```bash
npm install @bayit/shared-voice-services
```

## Usage

### Emotional Intelligence

```typescript
import { emotionalIntelligenceService } from '@bayit/shared-voice-services';

const analysis = emotionalIntelligenceService.analyzeVoicePattern(
  'Where is that movie I was looking for?',
  ['find movie', 'search movie', 'where is movie'],
  [false, false, false]
);

console.log(analysis.frustrationLevel); // 0.0 - 1.0
console.log(analysis.mood); // 'satisfied' | 'neutral' | 'frustrated' | 'confused'

if (analysis.suggestion) {
  console.log(analysis.suggestion); // Contextual help suggestion
}

// Adjust TTS based on frustration
const toneAdjustment = emotionalIntelligenceService.getToneAdjustment(
  analysis.frustrationLevel
);
console.log(toneAdjustment.ttsRate); // 0.8 (slow), 1.0 (normal), 1.2 (fast)
```

### Voice Processing

```typescript
import { voiceProcessor } from '@bayit/shared-voice-services';

const result = voiceProcessor.processTranscript(
  'Play the new Marvel movie',
  0.95 // confidence
);

console.log(result.intent.action); // 'play'
console.log(result.intent.entity); // 'the new Marvel movie'
console.log(result.shouldExecute); // true

// Get command history
const history = voiceProcessor.getRecentTranscripts(10);
```

### Conversation Context

```typescript
import { conversationContextManager } from '@bayit/shared-voice-services';

// Start conversation
conversationContextManager.addUserMessage(
  'session-123',
  'Show me action movies'
);

conversationContextManager.addAssistantMessage(
  'session-123',
  'Here are some action movies...',
  true, // success
  0.2 // frustration level
);

// Get conversation summary
const summary = conversationContextManager.getSummary('session-123');
console.log(summary.successRate); // 0.0 - 1.0
console.log(summary.averageFrustration); // 0.0 - 1.0
console.log(summary.topicsDiscussed); // ['movie', 'series', ...]
```

### Analytics

```typescript
import { voiceAnalytics } from '@bayit/shared-voice-services';

// Start session tracking
voiceAnalytics.startSession('session-123', 'user-456');

// Track commands
voiceAnalytics.trackCommand(
  'session-123',
  'search',
  true, // success
  0.95, // confidence
  0.3, // frustration
  'en-US'
);

// End session and get metrics
const metrics = voiceAnalytics.endSession('session-123');
console.log(metrics.totalCommands);
console.log(metrics.successRate);
console.log(metrics.averageFrustration);
console.log(metrics.mostUsedIntents);
```

## API Reference

### Emotional Intelligence

#### `emotionalIntelligenceService.analyzeVoicePattern(transcript, history, successHistory?)`

Analyzes voice patterns and returns emotional analysis.

**Returns:** `VoiceAnalysis`
- `frustrationLevel`: 0.0 - 1.0
- `mood`: 'satisfied' | 'neutral' | 'frustrated' | 'confused'
- `confidence`: 0.0 - 1.0
- `suggestion?`: Optional help suggestion
- `patterns`: Voice patterns detected

#### `emotionalIntelligenceService.getToneAdjustment(frustrationLevel)`

Returns TTS adjustments based on frustration.

**Returns:** `ToneAdjustment`
- `responseSpeed`: 'slow' | 'normal' | 'fast'
- `ttsRate`: 0.8 - 1.2
- `verbosity`: 'concise' | 'normal' | 'detailed'

### Voice Processor

#### `voiceProcessor.processTranscript(transcript, confidence?, language?)`

Processes voice transcript and detects intent.

**Returns:** `ProcessedCommand`
- `command`: Original voice command
- `intent`: Detected intent with action and entity
- `shouldExecute`: Whether to execute the command
- `reason?`: Optional reason if not executable

#### `voiceProcessor.getRecentTranscripts(count?)`

Gets recent command transcripts.

### Conversation Context

#### `conversationContextManager.addUserMessage(sessionId, content, metadata?)`

Adds user message to conversation context.

#### `conversationContextManager.addAssistantMessage(sessionId, content, success, frustrationLevel?, metadata?)`

Adds assistant response to conversation context.

#### `conversationContextManager.getSummary(sessionId)`

Gets conversation summary with metrics.

**Returns:** `ConversationSummary`
- `totalTurns`: Number of conversation turns
- `successRate`: 0.0 - 1.0
- `averageFrustration`: 0.0 - 1.0
- `duration`: Session duration in ms
- `topicsDiscussed`: Array of discussed topics
- `mostCommonIntents`: Array of common intents

### Analytics

#### `voiceAnalytics.startSession(sessionId, userId?)`

Starts tracking a voice session.

#### `voiceAnalytics.trackCommand(sessionId, intent, success, confidence, frustrationLevel, language?)`

Tracks a voice command execution.

#### `voiceAnalytics.endSession(sessionId)`

Ends session tracking and returns metrics.

**Returns:** `VoiceSessionMetrics`
- `totalCommands`: Total commands in session
- `successfulCommands`: Number of successful commands
- `successRate`: 0.0 - 1.0
- `averageConfidence`: Average recognition confidence
- `averageFrustration`: Average frustration level
- `mostUsedIntents`: Array of intent usage statistics

## Testing

```bash
npm test
npm run test:coverage
```

## License

Proprietary - Olorin Media Group
