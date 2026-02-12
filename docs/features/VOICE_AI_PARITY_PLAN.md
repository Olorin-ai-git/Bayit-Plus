# Voice & AI Assistant Platform Parity Plan

**Version:** 1.0
**Date:** 2026-02-12
**Status:** Planning
**Target Completion:** Q2 2026

## Executive Summary

This document outlines the comprehensive plan to achieve full feature parity and production readiness across all three Bayit+ platforms (tvOS, Web, iOS/Mobile) for voice and AI assistant capabilities.

**Current State:**
- **iOS/Mobile**: Most advanced (emotional intelligence, background listening)
- **Web**: Most configurable (multiple modes, VAD controls, AI Companion)
- **tvOS**: TV-optimized (10-foot UI, menu button integration)

**Goal:** Unified feature set across all platforms while maintaining platform-specific optimizations.

---

## Table of Contents

1. [Feature Parity Matrix](#feature-parity-matrix)
2. [Implementation Phases](#implementation-phases)
3. [Platform-Specific Plans](#platform-specific-plans)
4. [Shared Infrastructure](#shared-infrastructure)
5. [Testing Strategy](#testing-strategy)
6. [Production Readiness Checklist](#production-readiness-checklist)
7. [Timeline & Milestones](#timeline--milestones)
8. [Risk Assessment](#risk-assessment)

---

## Feature Parity Matrix

### Core Voice Features

| Feature | tvOS | Web | Mobile | Priority | Complexity |
|---------|------|-----|--------|----------|------------|
| **Wake Word Detection** | ✅ | ✅ | ✅ | P0 | Low |
| **Manual Voice Activation** | ✅ | ✅ | ✅ | P0 | Low |
| **Background Listening** | ⚠️ N/A | ❌ | ✅ | P1 | Medium |
| **Multi-Language Support** | ✅ | ✅ | ✅ | P0 | Low |
| **TTS Responses** | ✅ | ✅ | ✅ | P0 | Low |
| **Command History** | ✅ (basic) | ❌ | ✅ (advanced) | P1 | Low |
| **Session Metrics** | ✅ | ❌ | ✅ | P1 | Low |

### Advanced AI Features

| Feature | tvOS | Web | Mobile | Priority | Complexity |
|---------|------|-----|--------|----------|------------|
| **Emotional Intelligence** | ❌ | ❌ | ✅ | P0 | High |
| **Proactive Suggestions** | ✅ (basic) | ❌ | ✅ (advanced) | P1 | Medium |
| **Conversation Context** | ❌ | ✅ (sidebar) | ✅ (history) | P1 | Medium |
| **Adaptive TTS** | ❌ | ❌ | ✅ | P1 | Medium |
| **Pattern Analysis** | ❌ | ❌ | ✅ | P2 | High |

### Avatar System

| Feature | tvOS | Web | Mobile | Priority | Complexity |
|---------|------|-----|--------|----------|------------|
| **Display Modes** | ✅ (3 modes) | ✅ (4 modes) | ✅ (4 modes) | P0 | Low |
| **Mesh Avatar (Zeh Ani)** | ❌ | ✅ | ✅ | P1 | High |
| **Biometric Consent** | ❌ | ✅ | ✅ | P1 | Medium |
| **Avatar Animations** | ✅ | ✅ | ✅ | P2 | High |
| **Real-time Lip Sync** | ❌ | ❌ | ❌ | P3 | Very High |

### Voice Settings & Configuration

| Feature | tvOS | Web | Mobile | Priority | Complexity |
|---------|------|-----|--------|----------|------------|
| **Voice Modes** | Hybrid only | 3 modes | Hybrid only | P1 | Medium |
| **VAD Sensitivity** | ❌ | ✅ | Wake word only | P1 | Low |
| **Silence Threshold** | ❌ | ✅ | ❌ | P2 | Low |
| **TTS Volume** | ❌ | ✅ | ❌ | P1 | Low |
| **TTS Speed** | ✅ | ✅ | ✅ (adaptive) | P0 | Low |
| **Wake Word Customization** | ❌ | ✅ | ❌ | P2 | Medium |

### Platform-Specific Features

| Feature | Platform | Status | Portable | Priority |
|---------|----------|--------|----------|----------|
| Menu Button Integration | tvOS | ✅ | ❌ | P0 |
| Multi-Window System | tvOS | ✅ | ❌ | P1 |
| AI Companion Sidebar | Web | ✅ | ✅ | P1 |
| AppState Integration | Mobile | ✅ | ✅ | P1 |
| PiP Widget Integration | Mobile | ✅ | ⚠️ | P2 |

**Legend:**
- ✅ Implemented
- ❌ Missing
- ⚠️ Partially implemented or platform limitation
- **Priority:** P0 (Critical) → P3 (Nice to have)
- **Complexity:** Low (< 2 days), Medium (2-5 days), High (5-10 days), Very High (> 10 days)

---

## Implementation Phases

### Phase 1: Foundation & Shared Services (Weeks 1-3)

**Goal:** Create shared infrastructure and services used by all platforms

#### Tasks

1. **Shared Voice Service Layer**
   - Create `@bayit/shared/services/voice` package
   - Unified voice command processor interface
   - Common emotional intelligence service
   - Platform adapter pattern for native bridges
   - **Dependencies:** None
   - **Estimated effort:** 5 days
   - **Owner:** Backend team

2. **Shared Avatar Service**
   - Create `@bayit/shared/services/avatar` package
   - Unified mesh generation API client
   - Common biometric consent manager
   - Avatar mode configuration constants
   - **Dependencies:** None
   - **Estimated effort:** 3 days
   - **Owner:** Backend team

3. **Shared Voice Types**
   - Create `@bayit/shared/types/voice` package
   - Unified type definitions for all platforms
   - Session metrics types
   - Voice settings types
   - **Dependencies:** None
   - **Estimated effort:** 2 days
   - **Owner:** Frontend team

4. **Backend API Enhancements**
   - Add emotional intelligence endpoints
   - Add conversation context endpoints
   - Add pattern analysis endpoints
   - Add voice analytics endpoints
   - **Dependencies:** None
   - **Estimated effort:** 5 days
   - **Owner:** Backend team

**Deliverables:**
- `@bayit/shared-voice-services` package
- `@bayit/shared-avatar-services` package
- Updated backend API with new endpoints
- Comprehensive API documentation

---

### Phase 2: Core Feature Parity (Weeks 4-8)

**Goal:** Implement missing core features on each platform

#### 2A. tvOS Enhancements

**Priority Order:** P0 → P1 → P2

1. **Emotional Intelligence Integration** (P0)
   - Port `emotionalIntelligenceService` to tvOS
   - Integrate with `useVoiceCommandProcessor`
   - Add frustration detection
   - Implement adaptive TTS speed
   - **Dependencies:** Phase 1 shared services
   - **Estimated effort:** 8 days
   - **Files to create:**
     - `tvos-app/src/services/emotionalIntelligence.ts`
     - `tvos-app/src/hooks/useEmotionalVoice.ts`
   - **Files to modify:**
     - `tvos-app/src/hooks/useVoiceCommandProcessor.ts`
     - `tvos-app/src/hooks/useVoiceTV.ts`

2. **Mesh Avatar Integration** (P1)
   - Add Zeh Ani mesh generation screen
   - Implement biometric consent flow
   - Add 4th display mode (MINIMAL with large text for accessibility)
   - Integrate mesh preview with TV focus system
   - **Dependencies:** Phase 1 avatar services
   - **Estimated effort:** 10 days
   - **Files to create:**
     - `tvos-app/src/screens/TVMeshAvatarScreen.tsx`
     - `tvos-app/src/components/avatar/TVBiometricConsent.tsx`
     - `tvos-app/src/components/avatar/TVMeshPreview.tsx`
   - **Files to modify:**
     - `tvos-app/src/components/voice/TVAvatarPreferences.tsx`
     - `tvos-app/src/types/voice.ts`

3. **Enhanced Command History** (P1)
   - Add pattern analysis to command history
   - Implement context-aware suggestions based on history
   - Add history visualization UI
   - **Dependencies:** Phase 1 shared services
   - **Estimated effort:** 5 days
   - **Files to create:**
     - `tvos-app/src/components/voice/TVCommandHistoryView.tsx`
   - **Files to modify:**
     - `tvos-app/src/stores/voiceStore.ts`
     - `tvos-app/src/hooks/useVoiceCommandProcessor.ts`

4. **Multiple Voice Modes** (P1)
   - Implement Push-to-Talk mode (Menu button press & hold)
   - Implement Always-On mode (continuous listening)
   - Add mode selector in settings
   - **Dependencies:** None
   - **Estimated effort:** 6 days
   - **Files to create:**
     - `tvos-app/src/components/voice/TVVoiceModeSelector.tsx`
   - **Files to modify:**
     - `tvos-app/src/stores/voiceStore.ts`
     - `tvos-app/src/hooks/useVoiceTV.ts`
     - `tvos-app/src/components/voice/TVVoiceSettings.tsx`

5. **VAD Controls** (P1)
   - Add sensitivity slider
   - Add silence threshold configuration
   - Add visual feedback for VAD detection
   - **Dependencies:** None
   - **Estimated effort:** 4 days
   - **Files to modify:**
     - `tvos-app/src/components/voice/TVVoiceSettings.tsx`
     - `tvos-app/src/stores/voiceStore.ts`

#### 2B. Web Enhancements

**Priority Order:** P0 → P1 → P2

1. **Emotional Intelligence Integration** (P0)
   - Port `emotionalIntelligenceService` to web
   - Integrate with `useVoiceActionExecutor`
   - Add frustration detection
   - Implement adaptive TTS
   - **Dependencies:** Phase 1 shared services
   - **Estimated effort:** 7 days
   - **Files to create:**
     - `web/src/services/emotionalIntelligence.ts`
     - `web/src/hooks/useEmotionalVoice.ts`
   - **Files to modify:**
     - `web/src/hooks/useVoiceActionExecutor.ts`
     - `web/src/hooks/useVoiceSearch.ts`

2. **Command History System** (P1)
   - Create command history store
   - Add history persistence to localStorage
   - Add history viewer UI component
   - Integrate with emotional intelligence
   - **Dependencies:** Phase 1 shared services, 2B.1
   - **Estimated effort:** 5 days
   - **Files to create:**
     - `web/src/stores/commandHistoryStore.ts`
     - `web/src/components/voice/CommandHistory.tsx`
     - `web/src/components/voice/CommandHistoryViewer.tsx`

3. **Session Metrics Tracking** (P1)
   - Add session metrics to voice settings store
   - Track listening duration, processing time, confidence
   - Add metrics dashboard
   - **Dependencies:** None
   - **Estimated effort:** 4 days
   - **Files to create:**
     - `web/src/components/voice/VoiceMetricsDashboard.tsx`
   - **Files to modify:**
     - `web/src/stores/voiceSettingsStore.ts`

4. **Enhanced Proactive Suggestions** (P1)
   - Add time-based suggestions (Shabbat, morning rituals)
   - Add content-based suggestions
   - Add presence-based suggestions (page focus)
   - Auto-TTS for high-priority suggestions
   - **Dependencies:** Phase 1 shared services
   - **Estimated effort:** 6 days
   - **Files to create:**
     - `web/src/hooks/useProactiveVoice.ts`
     - `web/src/components/voice/ProactiveSuggestionBanner.tsx`

5. **Background Listening (Optional - Browser Limitations)** (P2)
   - Investigate Web Audio API background capabilities
   - Implement wake word detection with browser tab backgrounded
   - Add user preference toggle
   - **Dependencies:** None
   - **Estimated effort:** 8 days (research-heavy)
   - **Note:** May be blocked by browser security policies

#### 2C. Mobile Enhancements

**Priority Order:** P0 → P1 → P2

1. **AI Companion Sidebar** (P1)
   - Create mobile-optimized AI Companion drawer
   - Implement vocabulary tab
   - Implement context tab
   - Implement quiz tab
   - Add swipe gestures for navigation
   - **Dependencies:** Phase 1 shared services
   - **Estimated effort:** 10 days
   - **Files to create:**
     - `mobile-app/src/components/ai/AICompanionDrawer.tsx`
     - `mobile-app/src/components/ai/VocabularyTab.tsx`
     - `mobile-app/src/components/ai/ContextTab.tsx`
     - `mobile-app/src/components/ai/QuizTab.tsx`
     - `mobile-app/src/stores/aiCompanionStore.ts`

2. **Multiple Voice Modes** (P1)
   - Implement Push-to-Talk mode (long-press volume button)
   - Implement Always-On mode
   - Add mode selector in settings
   - **Dependencies:** None
   - **Estimated effort:** 6 days
   - **Files to create:**
     - `mobile-app/src/components/voice/VoiceModeSelector.tsx`
   - **Files to modify:**
     - `mobile-app/src/services/voiceManager.ts`
     - `mobile-app/src/components/voice/VoiceSettings.tsx`

3. **VAD Controls** (P1)
   - Add VAD sensitivity selector
   - Add silence threshold slider
   - Add visual VAD feedback
   - **Dependencies:** None
   - **Estimated effort:** 4 days
   - **Files to modify:**
     - `mobile-app/src/components/voice/VoiceSettings.tsx`
     - `mobile-app/src/services/voiceManager.ts`

4. **Enhanced TTS Controls** (P1)
   - Add TTS volume control
   - Keep existing speed control
   - Add voice selection (if multiple voices available)
   - **Dependencies:** None
   - **Estimated effort:** 3 days
   - **Files to modify:**
     - `mobile-app/src/components/voice/VoiceSettings.tsx`
     - `mobile-app/src/services/voiceTtsPlayback.ts`

**Deliverables:**
- Feature-complete tvOS voice system
- Feature-complete web voice system
- Feature-complete mobile voice system
- Updated documentation for all platforms

---

### Phase 3: Advanced Features & Polish (Weeks 9-12)

**Goal:** Implement advanced features and platform-specific optimizations

#### 3A. Advanced AI Features (All Platforms)

1. **Conversation Memory** (P1)
   - Long-term conversation storage
   - Context retrieval for continuity
   - Privacy controls (retention period, manual clear)
   - **Estimated effort:** 8 days per platform
   - **Platforms:** All

2. **Intent Prediction** (P1)
   - ML-based intent classification
   - Proactive command suggestions
   - User behavior learning
   - **Dependencies:** Backend ML model
   - **Estimated effort:** 10 days backend + 5 days per platform

3. **Multi-Turn Conversations** (P2)
   - Context carryover between commands
   - Clarification questions
   - Follow-up command support
   - **Estimated effort:** 8 days per platform

4. **Voice Analytics Dashboard** (P2)
   - Usage statistics
   - Command frequency charts
   - Success rate metrics
   - **Estimated effort:** 5 days per platform

#### 3B. Avatar Enhancements (All Platforms)

1. **Avatar Animations Library** (P2)
   - Listening animation
   - Processing animation
   - Speaking animation (basic mouth movement)
   - Idle animation
   - **Dependencies:** Animation assets from design team
   - **Estimated effort:** 10 days (shared work)

2. **Real-time Lip Sync** (P3)
   - Audio analysis for phoneme detection
   - Mouth shape mapping
   - Smooth animation transitions
   - **Dependencies:** 3B.1
   - **Estimated effort:** 15 days (research + implementation)
   - **Note:** High complexity, may defer to future release

3. **Avatar Customization** (P2)
   - Color theme selection
   - Expression style (formal, casual, friendly)
   - Animation speed preferences
   - **Estimated effort:** 5 days per platform

#### 3C. Platform-Specific Optimizations

**tvOS:**
1. Siri Remote gesture shortcuts
2. Top Shelf integration for voice suggestions
3. Multi-user voice profile support
4. **Estimated effort:** 6 days

**Web:**
1. Keyboard shortcuts for voice activation
2. Browser notification integration
3. Desktop notification support
4. **Estimated effort:** 5 days

**Mobile:**
1. Siri Shortcuts integration
2. Widget for quick voice access
3. Apple Watch companion support
4. **Estimated effort:** 8 days

**Deliverables:**
- Advanced AI features on all platforms
- Avatar animation system
- Platform-specific optimizations
- Performance benchmarks

---

### Phase 4: Testing & Quality Assurance (Weeks 13-15)

**Goal:** Comprehensive testing across all platforms

#### 4A. Automated Testing

1. **Unit Tests**
   - Voice service modules (target: 90% coverage)
   - Avatar service modules (target: 90% coverage)
   - Emotional intelligence service (target: 85% coverage)
   - Store/state management (target: 95% coverage)
   - **Estimated effort:** 10 days

2. **Integration Tests**
   - Voice activation flows
   - Command processing pipelines
   - Avatar generation flows
   - Multi-platform API integration
   - **Estimated effort:** 8 days

3. **E2E Tests**
   - Complete voice command flows
   - Avatar display modes switching
   - Settings persistence
   - Cross-platform scenarios
   - **Estimated effort:** 10 days

#### 4B. Manual Testing

1. **Functional Testing**
   - Feature verification checklist (see Production Readiness)
   - Cross-language testing (Hebrew, English, Spanish)
   - Edge case scenarios
   - **Estimated effort:** 8 days

2. **Usability Testing**
   - 10-foot UI testing (tvOS)
   - Desktop browser testing (Web)
   - Mobile device testing (iOS)
   - Accessibility testing (VoiceOver, TalkBack)
   - **Estimated effort:** 5 days

3. **Performance Testing**
   - Voice response latency
   - Memory usage during voice sessions
   - Battery impact (mobile)
   - Network usage optimization
   - **Estimated effort:** 5 days

4. **Stress Testing**
   - Long-running voice sessions
   - Rapid command sequences
   - Background/foreground transitions
   - Network interruption recovery
   - **Estimated effort:** 4 days

#### 4C. Beta Testing

1. **Internal Beta** (Week 13)
   - Team testing on all platforms
   - Bug reporting via Jira
   - Daily standup for critical issues

2. **External Beta (Beta 500)** (Week 14-15)
   - 50 users per platform (150 total)
   - Feedback collection via in-app survey
   - Weekly summary reports

**Deliverables:**
- Test coverage reports (>85% overall)
- Bug tracking dashboard
- Performance benchmark results
- Beta feedback summary

---

### Phase 5: Production Deployment (Week 16)

**Goal:** Gradual rollout to production

#### Rollout Strategy

1. **Day 1-2: Canary Deployment (1%)**
   - Deploy to 1% of users per platform
   - Monitor error rates, crash reports
   - Verify metrics collection

2. **Day 3-4: Limited Rollout (10%)**
   - Increase to 10% of users
   - Monitor voice command success rates
   - Verify backend capacity

3. **Day 5-6: Broader Rollout (50%)**
   - Increase to 50% of users
   - Monitor latency, response times
   - Collect user feedback

4. **Day 7: Full Deployment (100%)**
   - Complete rollout to all users
   - Announce feature launch
   - Publish blog post and documentation

**Rollback Plan:**
- Feature flags for instant disable
- Database rollback scripts prepared
- Previous version kept in standby

**Deliverables:**
- Production-ready code on all platforms
- Monitoring dashboards
- User documentation
- Launch announcement

---

## Platform-Specific Plans

### tvOS Implementation Details

#### Architecture Changes

```
tvos-app/
├── src/
│   ├── services/
│   │   ├── emotionalIntelligence.ts          [NEW]
│   │   ├── voiceAnalytics.ts                 [NEW]
│   │   └── meshAvatar.ts                     [NEW]
│   ├── hooks/
│   │   ├── useEmotionalVoice.ts              [NEW]
│   │   ├── useVoiceModes.ts                  [NEW]
│   │   ├── useCommandHistory.ts              [NEW]
│   │   └── useVoiceAnalytics.ts              [NEW]
│   ├── components/
│   │   ├── voice/
│   │   │   ├── TVVoiceModeSelector.tsx       [NEW]
│   │   │   ├── TVCommandHistoryView.tsx      [NEW]
│   │   │   ├── TVVADControls.tsx             [NEW]
│   │   │   └── TVVoiceMetrics.tsx            [NEW]
│   │   └── avatar/
│   │       ├── TVMeshAvatarScreen.tsx        [NEW]
│   │       ├── TVBiometricConsent.tsx        [NEW]
│   │       └── TVMeshPreview.tsx             [NEW]
│   └── screens/
│       └── TVMeshAvatarScreen.tsx            [NEW]
```

#### Key Implementation Tasks

1. **Emotional Intelligence Integration**
   ```typescript
   // tvos-app/src/hooks/useEmotionalVoice.ts
   export function useEmotionalVoice() {
     const { processCommand } = useVoiceCommandProcessor();
     const commandHistory = useVoiceStore(s => s.commandHistory);

     const processWithEmotion = async (transcript: string) => {
       const analysis = emotionalIntelligenceService.analyzeVoicePattern(
         transcript,
         commandHistory.map(c => c.command)
       );

       // Adjust TTS rate based on frustration
       const adjustedRate = getTTSRateAdjustment(analysis.frustrationLevel);

       await processCommand(transcript, { ttsRate: adjustedRate });
     };

     return { processWithEmotion };
   }
   ```

2. **Voice Modes Implementation**
   ```typescript
   // tvos-app/src/stores/voiceStore.ts
   interface VoiceStoreState {
     // ... existing fields
     voiceMode: 'hybrid' | 'push-to-talk' | 'always-on';
     setVoiceMode: (mode: VoiceMode) => void;
   }
   ```

3. **Mesh Avatar Screen**
   ```typescript
   // tvos-app/src/screens/TVMeshAvatarScreen.tsx
   export const TVMeshAvatarScreen: React.FC = () => {
     // Similar to mobile implementation but with TV-optimized UI
     // - Larger touch targets (1.4x scaling)
     // - Focus-based navigation
     // - Remote control optimized inputs
   };
   ```

---

### Web Implementation Details

#### Architecture Changes

```
web/
├── src/
│   ├── services/
│   │   ├── emotionalIntelligence.ts          [NEW]
│   │   ├── voiceAnalytics.ts                 [NEW]
│   │   └── commandHistory.ts                 [NEW]
│   ├── hooks/
│   │   ├── useEmotionalVoice.ts              [NEW]
│   │   ├── useProactiveVoice.ts              [NEW]
│   │   ├── useCommandHistory.ts              [NEW]
│   │   └── useVoiceMetrics.ts                [NEW]
│   ├── components/
│   │   ├── voice/
│   │   │   ├── CommandHistory.tsx            [NEW]
│   │   │   ├── CommandHistoryViewer.tsx      [NEW]
│   │   │   ├── VoiceMetricsDashboard.tsx     [NEW]
│   │   │   └── ProactiveSuggestionBanner.tsx [NEW]
│   │   └── settings/
│   │       └── voice/
│   │           └── components/
│   │               ├── SessionMetricsSection.tsx [NEW]
│   │               └── CommandHistorySection.tsx [NEW]
│   └── stores/
│       ├── commandHistoryStore.ts            [NEW]
│       └── voiceMetricsStore.ts              [NEW]
```

#### Key Implementation Tasks

1. **Command History Store**
   ```typescript
   // web/src/stores/commandHistoryStore.ts
   export const useCommandHistoryStore = create<CommandHistoryStore>()(
     persist(
       (set, get) => ({
         commands: [],
         maxHistory: 50,

         addCommand: (command, success, response) => {
           const analysis = emotionalIntelligenceService.analyzeVoicePattern(
             command,
             get().commands.map(c => c.text)
           );

           set((state) => ({
             commands: [
               { text: command, success, response, analysis, timestamp: Date.now() },
               ...state.commands
             ].slice(0, state.maxHistory)
           }));
         },

         clearHistory: () => set({ commands: [] }),
         getRecentCommands: (n) => get().commands.slice(0, n),
       }),
       { name: 'bayit-command-history' }
     )
   );
   ```

2. **Proactive Suggestions**
   ```typescript
   // web/src/hooks/useProactiveVoice.ts
   export function useProactiveVoice(options: ProactiveVoiceOptions) {
     const [currentSuggestion, setCurrentSuggestion] = useState<Suggestion | null>(null);

     const checkForSuggestions = useCallback(() => {
       const hour = new Date().getHours();
       const day = new Date().getDay();

       // Time-based suggestions
       if (day === 5 && hour >= 15 && hour < 18) {
         showSuggestion({
           type: 'time-based',
           message: 'Shabbat is approaching! Would you like to watch candle lighting preparation?',
           action: { type: 'navigate', payload: { path: '/judaism' } },
           priority: 'high'
         });
       }

       // ... more suggestion logic
     }, []);

     useEffect(() => {
       // Check every 10 minutes
       const interval = setInterval(checkForSuggestions, 600000);
       return () => clearInterval(interval);
     }, [checkForSuggestions]);

     return { currentSuggestion, executeSuggestion, dismissSuggestion };
   }
   ```

---

### Mobile Implementation Details

#### Architecture Changes

```
mobile-app/
├── src/
│   ├── components/
│   │   ├── ai/
│   │   │   ├── AICompanionDrawer.tsx         [NEW]
│   │   │   ├── VocabularyTab.tsx             [NEW]
│   │   │   ├── ContextTab.tsx                [NEW]
│   │   │   └── QuizTab.tsx                   [NEW]
│   │   └── voice/
│   │       ├── VoiceModeSelector.tsx         [NEW]
│   │       ├── VADControls.tsx               [NEW]
│   │       └── TTSVolumeControl.tsx          [NEW]
│   ├── stores/
│   │   ├── aiCompanionStore.ts               [NEW]
│   │   └── voiceModesStore.ts                [NEW]
│   └── hooks/
│       ├── useVoiceModes.ts                  [NEW]
│       └── useAICompanion.ts                 [NEW]
```

#### Key Implementation Tasks

1. **AI Companion Drawer**
   ```typescript
   // mobile-app/src/components/ai/AICompanionDrawer.tsx
   export const AICompanionDrawer: React.FC = () => {
     const { isVisible, activeTab, setActiveTab } = useAICompanionStore();

     return (
       <Drawer
         visible={isVisible}
         position="bottom"
         height="70%"
       >
         <TabView
           activeTab={activeTab}
           onChange={setActiveTab}
           tabs={[
             { key: 'vocabulary', label: 'Vocabulary', component: VocabularyTab },
             { key: 'context', label: 'Context', component: ContextTab },
             { key: 'quiz', label: 'Quiz', component: QuizTab },
           ]}
         />
       </Drawer>
     );
   };
   ```

2. **Voice Modes Implementation**
   ```typescript
   // mobile-app/src/hooks/useVoiceModes.ts
   export function useVoiceModes() {
     const [mode, setMode] = useState<VoiceMode>('hybrid');

     const activateMode = async (newMode: VoiceMode) => {
       if (newMode === 'push-to-talk') {
         // Set up volume button listener
         VolumeButtonModule.addListener((event) => {
           if (event.type === 'long-press') {
             voiceManager.startManualListening();
           }
         });
       } else if (newMode === 'always-on') {
         await voiceManager.startBackgroundListening();
       }

       setMode(newMode);
     };

     return { mode, activateMode };
   }
   ```

---

## Shared Infrastructure

### Backend API Enhancements

#### New Endpoints

```
POST   /api/v1/voice/analyze-emotion
POST   /api/v1/voice/conversation-context
GET    /api/v1/voice/conversation-history
POST   /api/v1/voice/pattern-analysis
GET    /api/v1/voice/analytics
POST   /api/v1/voice/proactive-suggestion
```

#### Endpoint Specifications

1. **Analyze Emotion**
   ```
   POST /api/v1/voice/analyze-emotion

   Request:
   {
     "transcript": "I can't find anything",
     "command_history": ["show movies", "search action", "find comedy"],
     "language": "en"
   }

   Response:
   {
     "frustration_level": 0.7,
     "mood": "frustrated",
     "confidence": 0.85,
     "suggestion": "Would you like me to help you browse categories instead?"
   }
   ```

2. **Conversation Context**
   ```
   POST /api/v1/voice/conversation-context

   Request:
   {
     "profile_id": "user123",
     "messages": [
       { "role": "user", "content": "Show me Israeli movies" },
       { "role": "assistant", "content": "Here are Israeli movies..." }
     ]
   }

   Response:
   {
     "context_id": "ctx_abc123",
     "summary": "User interested in Israeli cinema",
     "entities": ["Israeli movies"],
     "intent": "BROWSE_CONTENT"
   }
   ```

### Shared Packages

#### 1. @bayit/shared-voice-services

```typescript
// packages/shared-voice-services/src/index.ts
export { emotionalIntelligenceService } from './emotionalIntelligence';
export { voiceCommandProcessor } from './voiceCommandProcessor';
export { conversationContextManager } from './conversationContext';
export { voiceAnalytics } from './analytics';

// packages/shared-voice-services/src/emotionalIntelligence.ts
export class EmotionalIntelligenceService {
  analyzeVoicePattern(
    transcript: string,
    commandHistory: string[]
  ): VoiceAnalysis {
    // Shared implementation
  }

  generateAdaptiveResponse(
    originalResponse: string,
    frustrationLevel: number
  ): string {
    // Shared implementation
  }

  shouldOfferHelp(
    analysis: VoiceAnalysis,
    history: string[]
  ): boolean {
    // Shared implementation
  }
}
```

#### 2. @bayit/shared-avatar-services

```typescript
// packages/shared-avatar-services/src/index.ts
export { meshAvatarService } from './meshAvatar';
export { biometricConsentManager } from './biometricConsent';
export { avatarAnimationController } from './animations';

// packages/shared-avatar-services/src/meshAvatar.ts
export class MeshAvatarService {
  async generateMesh(
    avatarId: string,
    profileId: string,
    pin: string
  ): Promise<MeshStatus> {
    // Shared implementation
  }

  async pollMeshStatus(
    avatarId: string,
    onProgress: (status: MeshStatus) => void
  ): Promise<MeshStatus> {
    // Shared implementation
  }
}
```

---

## Testing Strategy

### Test Coverage Requirements

| Layer | Target | Current (Avg) | Gap |
|-------|--------|---------------|-----|
| **Services** | 90% | 45% | 45% |
| **Stores** | 95% | 60% | 35% |
| **Hooks** | 85% | 40% | 45% |
| **Components** | 80% | 30% | 50% |
| **E2E** | Critical paths | 0% | 100% |

### Testing Phases

#### Phase 4A: Unit Testing (Week 13)

**Service Tests:**
```typescript
// __tests__/services/emotionalIntelligence.test.ts
describe('EmotionalIntelligenceService', () => {
  it('should detect frustration from repeated failed commands', () => {
    const history = ['search movies', 'find movies', 'show movies'];
    const analysis = emotionalIntelligenceService.analyzeVoicePattern(
      'where are the movies',
      history
    );

    expect(analysis.frustrationLevel).toBeGreaterThan(0.5);
    expect(analysis.mood).toBe('frustrated');
  });

  it('should adapt response for high frustration', () => {
    const original = 'I could not find that content.';
    const adapted = emotionalIntelligenceService.generateAdaptiveResponse(
      original,
      0.8
    );

    expect(adapted).toContain('let me help');
  });
});
```

**Store Tests:**
```typescript
// __tests__/stores/voiceStore.test.ts
describe('VoiceStore', () => {
  it('should track session metrics', () => {
    const store = useVoiceStore.getState();

    store.startListening('manual');
    expect(store.sessionMetrics).toBeDefined();
    expect(store.sessionMetrics?.startTime).toBeGreaterThan(0);

    store.endSession(true);
    expect(store.sessionMetrics?.durationMs).toBeGreaterThan(0);
  });

  it('should maintain command history', () => {
    const store = useVoiceStore.getState();

    store.addCommandToHistory('play movie', true);
    store.addCommandToHistory('pause', true);

    expect(store.commandHistory).toHaveLength(2);
    expect(store.getLastNCommands(1)[0].command).toBe('pause');
  });
});
```

#### Phase 4B: Integration Testing (Week 13-14)

**Voice Flow Tests:**
```typescript
// __tests__/integration/voiceFlow.test.ts
describe('Voice Command Flow', () => {
  it('should process voice command end-to-end', async () => {
    const { startListening, stopListening, transcript } = renderHook(() =>
      useVoiceMobile()
    );

    await startListening();

    // Simulate speech recognition result
    act(() => {
      speechService.emit('result', {
        transcription: 'play Fauda',
        confidence: 0.9,
        isFinal: true
      });
    });

    await waitFor(() => {
      expect(transcript).toBe('play Fauda');
    });

    // Verify backend API called
    expect(mockApi.post).toHaveBeenCalledWith('/voice/command', {
      transcription: 'play Fauda',
      language: 'en',
      confidence: 0.9
    });
  });
});
```

#### Phase 4C: E2E Testing (Week 14-15)

**Critical User Journeys:**
1. Voice activation → command → response → action execution
2. Avatar generation → consent → mesh creation → preview
3. Settings change → persistence → verification
4. Multi-language command → correct response
5. Emotional pattern → adaptive response

**E2E Test Example:**
```typescript
// e2e/voice-command.e2e.ts
describe('Voice Command E2E', () => {
  it('should complete voice search flow', async () => {
    // 1. Open app
    await device.launchApp();

    // 2. Activate voice
    await element(by.id('voice-button')).tap();

    // 3. Wait for listening state
    await waitFor(element(by.id('voice-listening-indicator')))
      .toBeVisible()
      .withTimeout(2000);

    // 4. Simulate voice input (via test API)
    await voiceTestAPI.sendCommand('show Israeli movies');

    // 5. Verify navigation to results
    await waitFor(element(by.id('search-results')))
      .toBeVisible()
      .withTimeout(5000);

    // 6. Verify correct content displayed
    await expect(element(by.text('Israeli Movies'))).toBeVisible();
  });
});
```

### Performance Testing

**Metrics to Track:**

| Metric | tvOS | Web | Mobile | Target |
|--------|------|-----|--------|--------|
| Voice activation time | < 300ms | < 200ms | < 250ms | Pass |
| Speech recognition latency | < 500ms | < 400ms | < 450ms | Pass |
| API response time | < 1000ms | < 800ms | < 900ms | Pass |
| TTS start time | < 300ms | < 250ms | < 300ms | Pass |
| Memory usage (idle) | < 50MB | < 30MB | < 40MB | Pass |
| Memory usage (active) | < 100MB | < 60MB | < 80MB | Pass |
| Battery drain (1hr) | N/A | N/A | < 5% | Pass |

---

## Production Readiness Checklist

### Code Quality

- [ ] All platforms achieve ≥85% test coverage
- [ ] Zero critical or high-severity bugs
- [ ] Code review approval from ≥2 reviewers per platform
- [ ] Static analysis passes (ESLint, TypeScript strict mode)
- [ ] No console.log/print statements in production code
- [ ] All hardcoded values moved to configuration

### Performance

- [ ] Voice activation < 300ms on all platforms
- [ ] API latency < 1s for 95th percentile
- [ ] Memory usage within targets
- [ ] No memory leaks in 24-hour stress test
- [ ] Battery impact < 5% per hour (mobile)
- [ ] Smooth 60fps animations on all platforms

### Accessibility

- [ ] VoiceOver/TalkBack support on all platforms
- [ ] Keyboard navigation support (web, tvOS)
- [ ] High contrast mode support
- [ ] Text scaling support (1.0x - 2.0x)
- [ ] WCAG 2.1 AA compliance (web)
- [ ] Focus indicators visible on all interactive elements

### Security

- [ ] No sensitive data in logs
- [ ] Biometric consent properly enforced
- [ ] PIN validation with rate limiting
- [ ] Audio data encrypted in transit
- [ ] Voice recordings not stored without consent
- [ ] GDPR compliance for EU users

### Documentation

- [ ] API documentation complete
- [ ] User guides for all platforms
- [ ] Developer onboarding guide
- [ ] Architecture decision records (ADRs)
- [ ] Troubleshooting guide
- [ ] Release notes prepared

### Monitoring

- [ ] Error tracking configured (Sentry)
- [ ] Analytics events defined and implemented
- [ ] Performance monitoring dashboards
- [ ] Voice command success rate tracking
- [ ] User satisfaction metrics (NPS)
- [ ] Alert thresholds configured

### Deployment

- [ ] Feature flags implemented
- [ ] Rollback plan tested
- [ ] Database migrations tested
- [ ] CDN cache invalidation plan
- [ ] App store submissions approved (mobile, tvOS)
- [ ] Support team trained

---

## Timeline & Milestones

### Gantt Chart

```
Week 1-3   [████████████] Foundation & Shared Services
Week 4-5   [████████████] tvOS Core Features
Week 6-7   [████████████] Web Core Features
Week 8     [████████████] Mobile Core Features
Week 9-10  [████████████] Advanced AI Features
Week 11-12 [████████████] Avatar Enhancements & Polish
Week 13    [████████████] Unit & Integration Testing
Week 14-15 [████████████] E2E Testing & Beta
Week 16    [████████████] Production Deployment
```

### Key Milestones

| Week | Milestone | Deliverable | Success Criteria |
|------|-----------|-------------|------------------|
| **3** | Foundation Complete | Shared packages published | All platforms can import shared services |
| **8** | Core Parity Achieved | All P0/P1 features implemented | Feature matrix shows 100% for P0/P1 |
| **12** | Feature Complete | All features implemented | Full feature parity across platforms |
| **13** | Testing Complete | All tests passing | ≥85% coverage, 0 critical bugs |
| **15** | Beta Complete | Beta feedback collected | ≥4.0/5.0 satisfaction score |
| **16** | Production Launch | All platforms live | Rollout complete, monitoring green |

### Sprint Breakdown

#### Sprint 1-2 (Week 1-3): Foundation
- **Goal:** Create shared infrastructure
- **Team allocation:** 2 backend, 1 frontend (shared packages)
- **Key deliverable:** @bayit/shared-voice-services package

#### Sprint 3-4 (Week 4-5): tvOS Core
- **Goal:** Implement P0/P1 features on tvOS
- **Team allocation:** 2 tvOS developers
- **Key deliverable:** tvOS emotional intelligence + mesh avatar

#### Sprint 5-6 (Week 6-7): Web Core
- **Goal:** Implement P0/P1 features on web
- **Team allocation:** 2 web developers
- **Key deliverable:** Web command history + proactive suggestions

#### Sprint 7-8 (Week 8): Mobile Core
- **Goal:** Implement P0/P1 features on mobile
- **Team allocation:** 2 mobile developers
- **Key deliverable:** Mobile AI Companion + voice modes

#### Sprint 9-10 (Week 9-10): Advanced Features
- **Goal:** Implement P2 features across platforms
- **Team allocation:** 1 developer per platform + 1 backend
- **Key deliverable:** Conversation memory, intent prediction

#### Sprint 11-12 (Week 11-12): Polish & Animations
- **Goal:** Avatar animations and platform optimizations
- **Team allocation:** 1 developer per platform + 1 designer
- **Key deliverable:** Avatar animation library

#### Sprint 13 (Week 13): Testing Phase 1
- **Goal:** Unit + integration tests
- **Team allocation:** Full team (everyone writes tests)
- **Key deliverable:** 85% test coverage

#### Sprint 14-15 (Week 14-15): Testing Phase 2
- **Goal:** E2E tests + beta program
- **Team allocation:** 2 QA + full dev team for bug fixes
- **Key deliverable:** Beta feedback report

#### Sprint 16 (Week 16): Production Launch
- **Goal:** Deploy to production
- **Team allocation:** DevOps + on-call rotation
- **Key deliverable:** 100% rollout complete

---

## Risk Assessment

### High-Risk Items

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| **Emotional Intelligence accuracy** | High | Medium | - Extensive testing with diverse user patterns<br>- Confidence thresholds<br>- Manual override option |
| **Mesh avatar generation failures** | Medium | Medium | - Robust error handling<br>- Retry logic<br>- Fallback to default avatar |
| **Cross-platform API inconsistencies** | High | Low | - Comprehensive integration tests<br>- Shared service layer<br>- API versioning |
| **Performance regression** | High | Medium | - Continuous performance monitoring<br>- Benchmarks on every PR<br>- Load testing before launch |
| **Privacy/consent violations** | Critical | Low | - Legal review of consent flows<br>- GDPR compliance audit<br>- Privacy-first design |

### Medium-Risk Items

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| **Test coverage gaps** | Medium | Medium | - Mandatory coverage thresholds<br>- Code review checklist<br>- Automated coverage reports |
| **Timeline delays** | Medium | High | - Buffer time in schedule<br>- Feature flags for partial rollout<br>- Clear prioritization (P0-P3) |
| **Backend capacity issues** | Medium | Low | - Load testing<br>- Auto-scaling configured<br>- Rate limiting |
| **Third-party service downtime** | Medium | Low | - Fallback mechanisms<br>- Circuit breakers<br>- Service monitoring |

### Low-Risk Items

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| **Minor UI bugs** | Low | High | - Beta testing program<br>- Incremental rollout<br>- Quick hotfix process |
| **Documentation gaps** | Low | Medium | - Documentation review in PR process<br>- User feedback collection |
| **Localization issues** | Low | Medium | - Native speaker review<br>- Context-aware translation |

---

## Success Metrics

### Quantitative Metrics

| Metric | Baseline | Target | Measurement Method |
|--------|----------|--------|-------------------|
| **Voice Command Success Rate** | 70% | 85% | Backend analytics |
| **User Adoption (Voice)** | 15% | 40% | Daily active users with voice |
| **Avatar Adoption** | 0% | 20% | Users with mesh avatar |
| **Voice Session Duration** | 30s | 60s | Session metrics |
| **Proactive Suggestion CTR** | N/A | 15% | Click-through rate |
| **Voice Re-engagement** | 30% | 50% | Users returning to voice within 7 days |
| **Emotional Detection Accuracy** | N/A | 80% | Manual review of 1000 samples |

### Qualitative Metrics

- **User Satisfaction:** NPS ≥ 40 for voice features
- **Beta Feedback:** ≥ 4.0/5.0 average rating
- **Support Tickets:** < 5% of users submit voice-related tickets
- **App Store Reviews:** Maintain 4.5+ rating mentioning voice

### Business Metrics

- **Beta 500 Credits:** 60% of users engage with AI features using credits
- **Retention Impact:** +10% retention for voice users vs non-voice
- **Feature Stickiness:** 70% of voice users return weekly
- **Upsell Opportunity:** 25% of free users consider upgrade after using AI features

---

## Appendix

### A. Glossary

- **VAD:** Voice Activity Detection - detects when user is speaking
- **TTS:** Text-to-Speech - converts text responses to audio
- **STT:** Speech-to-Text - converts audio to text (recognition)
- **Mesh Avatar:** 3D personalized avatar generated from photos
- **Zeh Ani:** "This is me" in Hebrew - our avatar generation service
- **Emotional Intelligence:** Analyzing user frustration and adapting responses
- **Proactive Suggestions:** AI-initiated suggestions without user prompt
- **Wake Word:** Activation phrase ("Buyit") to start listening
- **Session Metrics:** Data collected during a voice interaction session

### B. References

- Backend API: `/docs/api/VOICE_API.md`
- Shared Services: `packages/shared-voice-services/README.md`
- Avatar System: `/docs/features/ZEH_ANI_MESH_AVATAR.md`
- Testing Guide: `/docs/guides/TESTING_VOICE_FEATURES.md`
- Security Review: `/docs/security/VOICE_SECURITY_AUDIT.md`

### C. Team Contacts

| Role | Name | Slack | Email |
|------|------|-------|-------|
| Technical Lead | TBD | @tech-lead | tech-lead@bayit.tv |
| Backend Lead | TBD | @backend-lead | backend@bayit.tv |
| iOS Lead | TBD | @ios-lead | ios@bayit.tv |
| Web Lead | TBD | @web-lead | web@bayit.tv |
| tvOS Lead | TBD | @tvos-lead | tvos@bayit.tv |
| QA Lead | TBD | @qa-lead | qa@bayit.tv |
| Product Manager | TBD | @pm | pm@bayit.tv |

### D. Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-02-12 | 1.0 | Initial plan created | Claude |

---

**Next Steps:**

1. **Immediate (This Week):**
   - Review plan with technical leads
   - Get stakeholder approval
   - Assign team members to phases
   - Create Jira epics and stories

2. **Week 1:**
   - Kick off Phase 1 (Foundation)
   - Set up project structure
   - Create shared packages
   - Backend API design review

3. **Week 2:**
   - Continue Phase 1
   - Weekly sync meetings start
   - Risk mitigation planning
   - Test environment setup

---

**Document Approval:**

- [ ] Technical Lead
- [ ] Product Manager
- [ ] Engineering Manager
- [ ] QA Lead

**Version Control:**
This document is version-controlled in `/docs/features/VOICE_AI_PARITY_PLAN.md`
