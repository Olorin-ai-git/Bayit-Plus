# Voice & AI Assistant - Architecture & Implementation Guide

**Plan Reference:** `/docs/features/VOICE_AI_PARITY_PLAN.md`
**Last Updated:** 2026-02-12
**Version:** 1.0

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagrams](#architecture-diagrams)
3. [Shared Services](#shared-services)
4. [Platform-Specific Implementations](#platform-specific-implementations)
5. [Data Flow](#data-flow)
6. [API Specifications](#api-specifications)
7. [Implementation Patterns](#implementation-patterns)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Platforms                             │
├─────────────┬─────────────────┬─────────────────────────────────┤
│   tvOS      │      Web        │         iOS/Mobile              │
│  (Apple TV) │   (React Web)   │    (React Native)               │
└─────┬───────┴────────┬────────┴──────────┬──────────────────────┘
      │                │                   │
      │         ┌──────▼────────┐         │
      │         │  Shared       │         │
      └────────▶│  Services     │◀────────┘
                │  Layer        │
                └───────┬───────┘
                        │
                ┌───────▼────────┐
                │   Backend API  │
                │   (FastAPI)    │
                └───────┬────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
    ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
    │ MongoDB │   │ Olorin  │   │  Zeh    │
    │ (Beanie)│   │Services │   │  Ani    │
    └─────────┘   └─────────┘   └─────────┘
```

### Component Layers

1. **Platform Layer** (tvOS, Web, Mobile)
   - Native UI components
   - Platform-specific voice APIs
   - Local state management
   - User interaction handling

2. **Shared Services Layer**
   - `@bayit/shared-voice-services`
   - `@bayit/shared-avatar-services`
   - `@bayit/shared-types`
   - Cross-platform business logic

3. **Backend API Layer**
   - Voice command processing
   - Emotional intelligence analysis
   - Conversation context management
   - Mesh avatar generation

4. **Data Layer**
   - User profiles (MongoDB)
   - Voice settings
   - Command history
   - Biometric consents

---

## Architecture Diagrams

### Voice Command Flow

```
┌─────────────┐
│    User     │
│  Speaks     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         Voice Activation                 │
│  (Wake Word / Button Press / Always-On) │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌─────────┐         ┌──────────┐
│ Native  │         │   Web    │
│ Speech  │         │ Speech   │
│ (iOS/   │         │   API    │
│ tvOS)   │         │          │
└────┬────┘         └─────┬────┘
     │                    │
     └──────────┬─────────┘
                │
                ▼
    ┌────────────────────┐
    │   Transcription    │
    │   (Real-time)      │
    └──────────┬─────────┘
               │
               ▼
    ┌────────────────────┐
    │  Command History   │
    │   & Context        │
    └──────────┬─────────┘
               │
               ▼
    ┌────────────────────────────┐
    │  Emotional Intelligence    │
    │  (Frustration Detection)   │
    └──────────┬─────────────────┘
               │
               ▼
    ┌─────────────────────┐
    │  Backend Voice API  │
    │  /voice/command     │
    └──────────┬──────────┘
               │
        ┌──────┴───────┐
        │              │
        ▼              ▼
    ┌───────┐     ┌────────┐
    │ Intent│     │ Entity │
    │Parser │     │Extract │
    └───┬───┘     └────┬───┘
        │              │
        └──────┬───────┘
               │
               ▼
    ┌──────────────────┐
    │  Action Router   │
    │  (Navigate/Play/ │
    │   Search/etc)    │
    └──────────┬───────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
    ┌───────┐    ┌──────────┐
    │  TTS  │    │  UI      │
    │(Audio)│    │ Action   │
    └───────┘    └──────────┘
```

### Emotional Intelligence System

```
┌────────────────────────────────────────────┐
│         Voice Command Input                 │
│  "I can't find action movies"              │
└─────────────────┬──────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         Command History Retrieval            │
│  ["search movies", "find action",           │
│   "show action", ...]                       │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│      Pattern Analysis Engine                │
│                                              │
│  • Repeated keywords? ✓                     │
│  • Escalating language? ✓                   │
│  • Success rate drop? ✓                     │
│  • Time between commands? ✓                 │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│      Frustration Scoring                    │
│                                              │
│  Base score: 0.3                            │
│  + Repeated failures: +0.4                  │
│  + Escalating: +0.2                         │
│  ────────────────────                       │
│  Total: 0.9 (High Frustration)             │
└─────────────────┬───────────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
┌──────────────┐   ┌──────────────┐
│  TTS Rate    │   │  Response    │
│  Adjustment  │   │  Tone        │
│              │   │  Softening   │
│  1.0 → 0.8   │   │              │
│  (Slower)    │   │  "Let me     │
│              │   │   help..."   │
└──────────────┘   └──────────────┘

         ┌────────┴────────┐
         │                 │
         ▼                 ▼
┌──────────────┐   ┌──────────────┐
│  Proactive   │   │  Context     │
│  Help Offer  │   │  Suggestion  │
│              │   │              │
│  "Would you  │   │  "Try        │
│   like to    │   │   browsing   │
│   browse?"   │   │   instead"   │
└──────────────┘   └──────────────┘
```

### Mesh Avatar Generation Flow

```
┌──────────────┐
│    User      │
│  Requests    │
│   Avatar     │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────┐
│  Biometric Consent Check    │
│                              │
│  ┌─────────────────────┐   │
│  │ mesh_generation    │✓  │
│  │ voice_v2v          │✓  │
│  │ latent_features    │✓  │
│  └─────────────────────┘   │
└──────────┬──────────────────┘
           │
      ┌────┴────┐
      │ Missing │
      │ Consent?│
      └────┬────┘
           │
    Yes ◄──┴──► No
     │           │
     ▼           ▼
┌─────────┐  ┌──────────────────┐
│ Consent │  │ POST /mesh/      │
│  Flow   │  │  generate        │
│         │  │                  │
│ PIN     │  │ {                │
│ Entry   │  │   avatar_id,     │
│         │  │   profile_id,    │
│ Grant   │  │   pin            │
│ All 3   │  │ }                │
└────┬────┘  └────────┬─────────┘
     │                │
     └────────┬───────┘
              │
              ▼
┌─────────────────────────────┐
│  Mesh Generation Backend    │
│                              │
│  1. Validate PIN             │
│  2. Check consent            │
│  3. Queue generation job     │
│  4. Return initial status    │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Polling Loop (3s interval) │
│                              │
│  GET /mesh/{avatar_id}      │
└──────────┬──────────────────┘
           │
    ┌──────┴──────┐
    │   Status    │
    └──────┬──────┘
           │
   ┌───────┴───────┐
   │               │
   ▼               ▼
┌────────┐    ┌─────────┐
│pending │    │processing│
│        │    │         │
│Continue│    │Continue │
│Polling │    │Polling  │
└────────┘    └─────────┘
                   │
            ┌──────┴──────┐
            │             │
            ▼             ▼
        ┌──────┐      ┌──────┐
        │ready │      │failed│
        └───┬──┘      └───┬──┘
            │             │
            │             ▼
            │         ┌────────┐
            │         │ Show   │
            │         │ Error  │
            │         └────────┘
            │
            ▼
┌─────────────────────┐
│ GET /mesh/{id}/glb  │
│                      │
│ Returns signed URL   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Display Thumbnail  │
│  + 3D Preview       │
└─────────────────────┘
```

---

## Shared Services

### Package Structure

```
packages/
├── shared-voice-services/
│   ├── src/
│   │   ├── emotionalIntelligence/
│   │   │   ├── index.ts
│   │   │   ├── patternAnalysis.ts
│   │   │   ├── frustrationDetection.ts
│   │   │   ├── toneAdjustment.ts
│   │   │   └── helpSuggestion.ts
│   │   ├── voiceProcessor/
│   │   │   ├── index.ts
│   │   │   ├── commandParser.ts
│   │   │   ├── intentClassifier.ts
│   │   │   └── entityExtractor.ts
│   │   ├── conversationContext/
│   │   │   ├── index.ts
│   │   │   ├── contextManager.ts
│   │   │   └── memoryStore.ts
│   │   ├── analytics/
│   │   │   ├── index.ts
│   │   │   ├── sessionMetrics.ts
│   │   │   └── eventTracking.ts
│   │   └── index.ts
│   ├── package.json
│   └── README.md
│
├── shared-avatar-services/
│   ├── src/
│   │   ├── meshAvatar/
│   │   │   ├── index.ts
│   │   │   ├── generationClient.ts
│   │   │   ├── pollingService.ts
│   │   │   └── previewLoader.ts
│   │   ├── biometricConsent/
│   │   │   ├── index.ts
│   │   │   ├── consentManager.ts
│   │   │   └── pinValidator.ts
│   │   ├── animations/
│   │   │   ├── index.ts
│   │   │   ├── animationController.ts
│   │   │   └── lipSyncEngine.ts
│   │   └── index.ts
│   ├── package.json
│   └── README.md
│
└── shared-voice-types/
    ├── src/
    │   ├── voice.ts
    │   ├── session.ts
    │   ├── settings.ts
    │   ├── avatar.ts
    │   └── index.ts
    ├── package.json
    └── README.md
```

### Emotional Intelligence Service

#### Interface

```typescript
// packages/shared-voice-services/src/emotionalIntelligence/index.ts

export interface VoiceAnalysis {
  frustrationLevel: number;      // 0.0 - 1.0
  mood: 'satisfied' | 'neutral' | 'frustrated' | 'confused';
  confidence: number;             // 0.0 - 1.0
  suggestion?: string;
  patterns: {
    repeatedKeywords: string[];
    failureCount: number;
    successRate: number;
    avgResponseTime: number;
  };
}

export interface ToneAdjustment {
  responseSpeed: 'slow' | 'normal' | 'fast';
  ttsRate: number;                // 0.5 - 2.0
  verbosity: 'concise' | 'normal' | 'detailed';
}

export class EmotionalIntelligenceService {
  /**
   * Analyze user's voice pattern for emotional state
   */
  analyzeVoicePattern(
    currentTranscript: string,
    commandHistory: string[]
  ): VoiceAnalysis;

  /**
   * Generate adaptive response based on frustration level
   */
  generateAdaptiveResponse(
    originalResponse: string,
    frustrationLevel: number
  ): string;

  /**
   * Determine if help should be offered
   */
  shouldOfferHelp(
    analysis: VoiceAnalysis,
    commandHistory: string[]
  ): boolean;

  /**
   * Generate contextual help suggestion
   */
  generateHelpSuggestion(analysis: VoiceAnalysis): string;

  /**
   * Get TTS tone adjustment based on frustration
   */
  getToneAdjustment(frustrationLevel: number): ToneAdjustment;
}
```

#### Implementation

```typescript
// packages/shared-voice-services/src/emotionalIntelligence/index.ts

import { analyzePatterns } from './patternAnalysis';
import { detectFrustration } from './frustrationDetection';
import { adjustTone } from './toneAdjustment';
import { generateHelp } from './helpSuggestion';

export class EmotionalIntelligenceService {
  analyzeVoicePattern(
    currentTranscript: string,
    commandHistory: string[]
  ): VoiceAnalysis {
    // Extract patterns from history
    const patterns = analyzePatterns(commandHistory);

    // Detect frustration level
    const frustrationLevel = detectFrustration(
      currentTranscript,
      commandHistory,
      patterns
    );

    // Determine mood
    let mood: VoiceAnalysis['mood'] = 'neutral';
    if (frustrationLevel > 0.7) mood = 'frustrated';
    else if (frustrationLevel > 0.4) mood = 'confused';
    else if (patterns.successRate > 0.8) mood = 'satisfied';

    // Generate suggestion if needed
    const suggestion = frustrationLevel > 0.6
      ? generateHelp({ frustrationLevel, patterns, currentTranscript })
      : undefined;

    return {
      frustrationLevel,
      mood,
      confidence: patterns.successRate,
      suggestion,
      patterns
    };
  }

  generateAdaptiveResponse(
    originalResponse: string,
    frustrationLevel: number
  ): string {
    if (frustrationLevel < 0.4) return originalResponse;

    // Soften tone for frustrated users
    if (frustrationLevel > 0.7) {
      return `I understand this is frustrating. ${originalResponse} Let me help you find what you're looking for.`;
    } else if (frustrationLevel > 0.5) {
      return `Let me try to help. ${originalResponse}`;
    }

    return originalResponse;
  }

  shouldOfferHelp(
    analysis: VoiceAnalysis,
    commandHistory: string[]
  ): boolean {
    // Offer help after 3+ consecutive failures
    const recentFailures = commandHistory
      .slice(0, 5)
      .filter(cmd => !this.wasSuccessful(cmd))
      .length;

    return recentFailures >= 3 || analysis.frustrationLevel > 0.7;
  }

  generateHelpSuggestion(analysis: VoiceAnalysis): string {
    const { patterns, frustrationLevel } = analysis;

    if (patterns.repeatedKeywords.includes('search') ||
        patterns.repeatedKeywords.includes('find')) {
      return "Would you like me to help you browse categories instead?";
    }

    if (frustrationLevel > 0.8) {
      return "I'm here to help! Try saying 'show me what's popular' or 'browse by category'.";
    }

    return "Would you like some suggestions on what to watch?";
  }

  getToneAdjustment(frustrationLevel: number): ToneAdjustment {
    if (frustrationLevel > 0.7) {
      return {
        responseSpeed: 'slow',
        ttsRate: 0.8,
        verbosity: 'detailed'
      };
    } else if (frustrationLevel < 0.3) {
      return {
        responseSpeed: 'fast',
        ttsRate: 1.2,
        verbosity: 'concise'
      };
    }

    return {
      responseSpeed: 'normal',
      ttsRate: 1.0,
      verbosity: 'normal'
    };
  }

  private wasSuccessful(command: string): boolean {
    // This would integrate with actual command execution tracking
    // For now, simple heuristic
    return !command.includes('where') &&
           !command.includes('can\'t find') &&
           !command.includes('not working');
  }
}

export const emotionalIntelligenceService = new EmotionalIntelligenceService();
```

### Mesh Avatar Service

#### Interface

```typescript
// packages/shared-avatar-services/src/meshAvatar/index.ts

export interface MeshGenerationRequest {
  avatarId: string;
  profileId: string;
  pin: string;
}

export interface MeshStatus {
  id: string;
  avatarId: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  progress?: number;              // 0-100
  thumbnailGcsPath?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeshGlbUrl {
  signedUrl: string;
  expiresInSeconds: number;
}

export class MeshAvatarService {
  /**
   * Initiate mesh generation
   */
  async generateMesh(request: MeshGenerationRequest): Promise<MeshStatus>;

  /**
   * Get current mesh status
   */
  async getMeshStatus(avatarId: string): Promise<MeshStatus>;

  /**
   * Get signed GLB URL for preview
   */
  async getGlbUrl(avatarId: string): Promise<MeshGlbUrl>;

  /**
   * Poll mesh status until terminal state
   */
  async pollMeshStatus(
    avatarId: string,
    onProgress: (status: MeshStatus) => void,
    intervalMs?: number
  ): Promise<MeshStatus>;
}
```

#### Implementation

```typescript
// packages/shared-avatar-services/src/meshAvatar/index.ts

import api from '@bayit/shared-services/api';

const TERMINAL_STATUSES = ['ready', 'failed'];
const DEFAULT_POLL_INTERVAL = 3000;

export class MeshAvatarService {
  async generateMesh(request: MeshGenerationRequest): Promise<MeshStatus> {
    const response = await api.post('/zeh-ani/mesh/generate', {
      avatar_id: request.avatarId,
      profile_id: request.profileId,
      pin: request.pin
    });

    return response as MeshStatus;
  }

  async getMeshStatus(avatarId: string): Promise<MeshStatus> {
    const response = await api.get(`/zeh-ani/mesh/${avatarId}`);
    return response as MeshStatus;
  }

  async getGlbUrl(avatarId: string): Promise<MeshGlbUrl> {
    const response = await api.get(`/zeh-ani/mesh/${avatarId}/glb`);
    return response as MeshGlbUrl;
  }

  async pollMeshStatus(
    avatarId: string,
    onProgress: (status: MeshStatus) => void,
    intervalMs: number = DEFAULT_POLL_INTERVAL
  ): Promise<MeshStatus> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.getMeshStatus(avatarId);
          onProgress(status);

          if (TERMINAL_STATUSES.includes(status.status)) {
            resolve(status);
          } else {
            setTimeout(poll, intervalMs);
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }
}

export const meshAvatarService = new MeshAvatarService();
```

---

## Platform-Specific Implementations

### tvOS Implementation

```typescript
// tvos-app/src/hooks/useEmotionalVoice.ts

import { useCallback } from 'react';
import { emotionalIntelligenceService } from '@bayit/shared-voice-services';
import { useVoiceStore } from '../stores/voiceStore';
import { useVoiceCommandProcessor } from './useVoiceCommandProcessor';
import { ttsService } from '../services/tts';
import { config } from '../config/appConfig';

export function useEmotionalVoice() {
  const commandHistory = useVoiceStore(s =>
    s.commandHistory.map(c => c.command)
  );
  const processCommand = useVoiceCommandProcessor({
    setIsProcessing: () => {},
    setTranscript: () => {},
    setError: () => {}
  });

  const processWithEmotion = useCallback(async (transcript: string) => {
    // Analyze emotional state
    const analysis = emotionalIntelligenceService.analyzeVoicePattern(
      transcript,
      commandHistory
    );

    // Get tone adjustment
    const toneAdjustment = emotionalIntelligenceService.getToneAdjustment(
      analysis.frustrationLevel
    );

    // Process command with adjusted settings
    await processCommand(transcript);

    // If help should be offered, add it to response
    if (emotionalIntelligenceService.shouldOfferHelp(analysis, commandHistory)) {
      const helpSuggestion = emotionalIntelligenceService.generateHelpSuggestion(
        analysis
      );

      await ttsService.speak(helpSuggestion, {
        language: config.voice.ttsLanguage,
        rate: toneAdjustment.ttsRate
      });
    }
  }, [commandHistory, processCommand]);

  return { processWithEmotion };
}
```

### Web Implementation

```typescript
// web/src/hooks/useEmotionalVoice.ts

import { useCallback } from 'react';
import { emotionalIntelligenceService } from '@bayit/shared-voice-services';
import { useCommandHistoryStore } from '@/stores/commandHistoryStore';
import { useVoiceActionExecutor } from './useVoiceActionExecutor';
import { ttsService } from '@/services/tts';

export function useEmotionalVoice() {
  const commandHistory = useCommandHistoryStore(s =>
    s.commands.map(c => c.text)
  );
  const addCommand = useCommandHistoryStore(s => s.addCommand);

  const processWithEmotion = useCallback(async (
    transcript: string,
    backendResponse: any
  ) => {
    // Analyze emotional state
    const analysis = emotionalIntelligenceService.analyzeVoicePattern(
      transcript,
      commandHistory
    );

    // Adapt response based on frustration
    let adaptedResponse = backendResponse.spokenResponse;
    if (adaptedResponse) {
      adaptedResponse = emotionalIntelligenceService.generateAdaptiveResponse(
        adaptedResponse,
        analysis.frustrationLevel
      );
    }

    // Add to command history with emotional analysis
    addCommand(transcript, backendResponse.success, adaptedResponse);

    // Get tone adjustment
    const toneAdjustment = emotionalIntelligenceService.getToneAdjustment(
      analysis.frustrationLevel
    );

    // Speak adapted response
    if (adaptedResponse) {
      await ttsService.speak(adaptedResponse, {
        rate: toneAdjustment.ttsRate
      });
    }

    // Offer help if needed
    if (emotionalIntelligenceService.shouldOfferHelp(analysis, commandHistory)) {
      const helpSuggestion = emotionalIntelligenceService.generateHelpSuggestion(
        analysis
      );

      setTimeout(() => {
        ttsService.speak(helpSuggestion, {
          rate: toneAdjustment.ttsRate
        });
      }, 1000);
    }

    return { analysis, adaptedResponse };
  }, [commandHistory, addCommand]);

  return { processWithEmotion };
}
```

---

## Data Flow

### Voice Command Data Flow

```
1. User Input
   ├─ Wake word detected OR
   ├─ Button pressed OR
   └─ Manual activation

2. Speech Recognition
   ├─ Platform-specific API
   ├─ Real-time transcription
   └─ Confidence scoring

3. Local Processing
   ├─ Update UI state (listening → processing)
   ├─ Add to command history
   └─ Emotional analysis (local)

4. Backend API Call
   ├─ POST /voice/command
   ├─ {
   │    transcription,
   │    language,
   │    confidence,
   │    context: { history, analysis }
   │  }
   └─ Returns { intent, action, response }

5. Response Handling
   ├─ TTS playback (adapted for emotion)
   ├─ UI action (navigate/play/search)
   └─ Update session metrics

6. State Updates
   ├─ Add to command history
   ├─ Update session metrics
   └─ Persist settings (if changed)
```

### Mesh Avatar Data Flow

```
1. User Initiates
   └─ Navigate to Avatar settings

2. Consent Check
   ├─ GET /zeh-ani/consent/biometric/{profileId}
   └─ Returns { consents: [...] }

3. Grant Missing Consents
   ├─ User enters PIN
   ├─ POST /zeh-ani/consent/biometric
   └─ For each missing consent type

4. Generate Mesh
   ├─ POST /zeh-ani/mesh/generate
   ├─ { avatar_id, profile_id, pin }
   └─ Returns initial status

5. Polling Loop
   ├─ Every 3 seconds:
   ├─ GET /zeh-ani/mesh/{avatarId}
   └─ Until status = ready|failed

6. Load Preview
   ├─ GET /zeh-ani/mesh/{avatarId}/glb
   ├─ Returns signed URL
   └─ Display thumbnail/3D preview

7. State Updates
   ├─ Update avatar visibility mode
   └─ Persist selection
```

---

## API Specifications

### Voice Endpoints

#### POST /voice/command

**Request:**
```json
{
  "transcription": "play Fauda season 2",
  "language": "en",
  "confidence": 0.9,
  "context": {
    "command_history": ["search movies", "show action"],
    "emotional_analysis": {
      "frustration_level": 0.3,
      "mood": "neutral"
    },
    "session_id": "sess_abc123"
  }
}
```

**Response:**
```json
{
  "intent": "PLAYBACK",
  "confidence": 0.95,
  "action": {
    "type": "play",
    "payload": {
      "content_id": "fauda",
      "content_type": "series",
      "season": 2,
      "episode": 1
    }
  },
  "spoken_response": "Playing Fauda season 2",
  "context_updated": true
}
```

#### POST /voice/analyze-emotion

**Request:**
```json
{
  "transcript": "I can't find anything",
  "command_history": [
    "search movies",
    "find action",
    "where are movies"
  ],
  "language": "en"
}
```

**Response:**
```json
{
  "frustration_level": 0.75,
  "mood": "frustrated",
  "confidence": 0.88,
  "suggestion": "Would you like me to help you browse categories instead?",
  "patterns": {
    "repeated_keywords": ["search", "find", "where"],
    "failure_count": 3,
    "success_rate": 0.25
  }
}
```

### Avatar Endpoints

#### POST /zeh-ani/mesh/generate

**Request:**
```json
{
  "avatar_id": "avatar_123",
  "profile_id": "profile_456",
  "pin": "1234"
}
```

**Response:**
```json
{
  "id": "mesh_789",
  "avatar_id": "avatar_123",
  "status": "pending",
  "progress": 0,
  "created_at": "2026-02-12T10:00:00Z",
  "updated_at": "2026-02-12T10:00:00Z"
}
```

#### GET /zeh-ani/mesh/{avatar_id}

**Response:**
```json
{
  "id": "mesh_789",
  "avatar_id": "avatar_123",
  "status": "processing",
  "progress": 45,
  "thumbnail_gcs_path": null,
  "created_at": "2026-02-12T10:00:00Z",
  "updated_at": "2026-02-12T10:02:30Z"
}
```

---

## Implementation Patterns

### Singleton Service Pattern

```typescript
// Use for shared services that should only have one instance

class ServiceName {
  private static instance: ServiceName;

  private constructor() {
    // Initialize
  }

  public static getInstance(): ServiceName {
    if (!ServiceName.instance) {
      ServiceName.instance = new ServiceName();
    }
    return ServiceName.instance;
  }

  // Methods...
}

export const serviceName = ServiceName.getInstance();
```

### Hook Composition Pattern

```typescript
// Compose multiple hooks for complex functionality

export function useVoiceWithEmotion() {
  const voice = useVoice();
  const emotion = useEmotionalIntelligence();
  const history = useCommandHistory();

  const processCommand = useCallback(async (transcript: string) => {
    const analysis = emotion.analyze(transcript, history.commands);
    const result = await voice.process(transcript);
    const adapted = emotion.adapt(result, analysis);

    history.add(transcript, result.success, analysis);

    return { result, analysis, adapted };
  }, [voice, emotion, history]);

  return { processCommand, ...voice, ...emotion };
}
```

### Platform Adapter Pattern

```typescript
// Abstract platform-specific implementations

interface VoicePlatformAdapter {
  startRecognition(): Promise<void>;
  stopRecognition(): Promise<void>;
  checkPermissions(): Promise<PermissionStatus>;
  requestPermissions(): Promise<PermissionResult>;
}

class IOSVoiceAdapter implements VoicePlatformAdapter {
  // iOS-specific implementation
}

class WebVoiceAdapter implements VoicePlatformAdapter {
  // Web-specific implementation
}

class TVOSVoiceAdapter implements VoicePlatformAdapter {
  // tvOS-specific implementation
}

// Factory
export function createVoiceAdapter(platform: Platform): VoicePlatformAdapter {
  switch (platform) {
    case 'ios': return new IOSVoiceAdapter();
    case 'web': return new WebVoiceAdapter();
    case 'tvos': return new TVOSVoiceAdapter();
  }
}
```

### Error Boundary Pattern

```typescript
// Wrap voice features with error boundaries

export function VoiceErrorBoundary({ children }: PropsWithChildren) {
  const handleError = useCallback((error: Error) => {
    logger.error('Voice system error', error);
    showNotification({
      level: 'error',
      title: 'Voice Error',
      message: 'Voice features temporarily unavailable'
    });
  }, []);

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={<VoiceFallbackUI />}
    >
      {children}
    </ErrorBoundary>
  );
}
```

---

## Best Practices

### Performance

1. **Debounce transcription updates** (avoid too many re-renders)
2. **Lazy load avatar meshes** (only when needed)
3. **Cache emotional analysis** (avoid re-computing)
4. **Limit command history size** (max 50 commands)
5. **Optimize polling intervals** (3s is good balance)

### Security

1. **Never log PINs or biometric data**
2. **Validate all user inputs**
3. **Rate limit API calls**
4. **Use HTTPS for all requests**
5. **Encrypt sensitive data in transit**

### Accessibility

1. **Provide visual feedback for voice state**
2. **Support screen readers**
3. **Offer keyboard shortcuts** (web)
4. **Large touch targets** (44x44 minimum)
5. **High contrast mode support**

### Testing

1. **Mock platform-specific APIs** in tests
2. **Test emotional analysis edge cases**
3. **Simulate network failures**
4. **Test with real voice commands**
5. **Measure performance metrics**

---

**Document Version:** 1.0
**Last Updated:** 2026-02-12
**Maintained By:** Engineering Team
