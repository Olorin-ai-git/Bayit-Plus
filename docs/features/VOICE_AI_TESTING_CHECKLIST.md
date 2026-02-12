# Voice & AI Features - Testing Checklist

**Plan Reference:** `VOICE_AI_PARITY_PLAN.md`
**Last Updated:** 2026-02-12

## Pre-Testing Setup

### Environment Setup
- [ ] Test devices configured for all platforms
  - [ ] Apple TV 4K (tvOS 17+)
  - [ ] iPhone 15 Pro (iOS 17+)
  - [ ] Desktop browsers (Chrome, Safari, Firefox)
  - [ ] Android test device (optional for web)
- [ ] Backend staging environment ready
- [ ] Test user accounts created (free + Beta 500)
- [ ] Analytics tracking configured
- [ ] Error monitoring (Sentry) active
- [ ] Network throttling tools available

### Test Data
- [ ] Sample voice commands in Hebrew, English, Spanish
- [ ] Test avatars/profiles created
- [ ] Mock biometric consent data
- [ ] Sample conversation history
- [ ] Test emotional patterns (frustrated, satisfied, confused)

---

## Unit Testing Checklist

### Services (Target: 90% coverage)

#### Emotional Intelligence Service
- [ ] `analyzeVoicePattern()` detects frustration from repeated failures
- [ ] `analyzeVoicePattern()` detects satisfaction from successful commands
- [ ] `generateAdaptiveResponse()` softens tone for high frustration
- [ ] `generateAdaptiveResponse()` maintains tone for normal frustration
- [ ] `shouldOfferHelp()` returns true after 3+ failed commands
- [ ] `shouldOfferHelp()` returns false for successful patterns
- [ ] `getToneAdjustment()` slows speech for high frustration
- [ ] Edge case: Empty command history handled
- [ ] Edge case: Very long command history handled (50+ commands)

#### Voice Command Processor
- [ ] Processes valid commands successfully
- [ ] Handles empty transcription
- [ ] Handles network errors gracefully
- [ ] Retries on timeout
- [ ] Updates session metrics correctly
- [ ] Adds commands to history
- [ ] Triggers TTS for responses
- [ ] Edge case: Very long transcription (500+ chars)
- [ ] Edge case: Special characters in transcription

#### Mesh Avatar Service
- [ ] `generateMesh()` initiates generation
- [ ] `pollMeshStatus()` polls until terminal state
- [ ] Handles generation failures
- [ ] Respects polling interval
- [ ] Stops polling on terminal state
- [ ] Edge case: Slow generation (5+ minutes)
- [ ] Edge case: Backend returns unexpected status

### Stores (Target: 95% coverage)

#### Voice Store (tvOS/Mobile)
- [ ] `startListening()` creates new session
- [ ] `startListening()` sets correct trigger type
- [ ] `stopListening()` ends session
- [ ] `setTranscription()` updates word count
- [ ] `addCommandToHistory()` maintains max 5 commands
- [ ] `endSession()` calculates duration
- [ ] `getSessionDuration()` returns correct duration for active session
- [ ] `isActiveSession()` returns true when listening/processing
- [ ] Edge case: Rapid start/stop calls
- [ ] Edge case: Session timeout triggers

#### Command History Store (Web)
- [ ] `addCommand()` adds to history
- [ ] `addCommand()` includes emotional analysis
- [ ] `addCommand()` respects max history limit
- [ ] `clearHistory()` clears all commands
- [ ] `getRecentCommands()` returns correct slice
- [ ] Persistence: localStorage saves correctly
- [ ] Persistence: localStorage restores correctly
- [ ] Edge case: localStorage quota exceeded

#### AI Companion Store (Web/Mobile)
- [ ] `open()` sets visible to true
- [ ] `close()` sets visible to false
- [ ] `toggle()` toggles visibility
- [ ] `setActiveTab()` changes tab
- [ ] `setContentId()` updates content reference
- [ ] Persistence: active tab persists
- [ ] Persistence: visibility does NOT persist

### Hooks (Target: 85% coverage)

#### useVoiceTV / useVoiceMobile / useVoiceWeb
- [ ] `startListening()` requests permissions if needed
- [ ] `startListening()` starts speech recognition
- [ ] `stopListening()` stops recognition
- [ ] `stopListening()` processes remaining transcript
- [ ] Handles recognition results
- [ ] Handles recognition errors
- [ ] Cleans up listeners on unmount
- [ ] Edge case: Permission denied
- [ ] Edge case: Microphone unavailable
- [ ] Edge case: Network error during recognition

#### useEmotionalVoice
- [ ] Analyzes voice patterns
- [ ] Adjusts TTS rate based on frustration
- [ ] Generates help suggestions when needed
- [ ] Integrates with command history
- [ ] Edge case: No command history available

#### useProactiveVoice
- [ ] Generates time-based suggestions
- [ ] Generates context-based suggestions
- [ ] Generates presence-based suggestions
- [ ] Respects minimum interval
- [ ] Auto-TTS for high-priority suggestions
- [ ] Dismisses suggestions after timeout
- [ ] Edge case: Rapid suggestion generation
- [ ] Edge case: User dismisses before TTS completes

---

## Integration Testing Checklist

### Voice Activation Flows

#### Wake Word Activation
- [ ] **tvOS:** "Buyit" triggers listening
- [ ] **Web:** "Buyit" triggers listening (Picovoice)
- [ ] **Mobile:** "Buyit" triggers listening
- [ ] Wake word sensitivity adjustment works
- [ ] False positives minimized (test with TV audio)
- [ ] Cooldown period prevents immediate re-trigger
- [ ] Background listening survives app background/foreground (mobile)

#### Manual Activation
- [ ] **tvOS:** Menu button long-press activates
- [ ] **Web:** Microphone button click activates
- [ ] **Mobile:** Voice button tap activates
- [ ] Visual feedback shows listening state
- [ ] Timeout stops listening after 30s (mobile) / 45s (tvOS)
- [ ] User can manually stop listening

#### Push-to-Talk Mode
- [ ] **tvOS:** Menu button press & hold
- [ ] **Web:** Button press & hold
- [ ] **Mobile:** Volume button press & hold
- [ ] Release triggers processing
- [ ] Visual indicator shows recording
- [ ] No timeout during hold
- [ ] Works with different button press durations

#### Always-On Mode
- [ ] **tvOS:** Continuous listening with wake word
- [ ] **Web:** Continuous listening with wake word
- [ ] **Mobile:** Background listening active
- [ ] Battery impact measured and acceptable (< 5%/hour mobile)
- [ ] Memory usage stable over time
- [ ] Survives app background/foreground

### Command Processing Flows

#### Simple Commands
- [ ] "Play Fauda" → Opens player
- [ ] "Search movies" → Opens search with query
- [ ] "Pause" → Pauses current playback
- [ ] "Resume" → Resumes playback
- [ ] "Next episode" → Advances to next episode
- [ ] "Show favorites" → Navigates to favorites
- [ ] "What should I watch?" → Shows recommendations

#### Multi-Language Commands
- [ ] Hebrew command: "הצג סרטים ישראליים"
- [ ] English command: "Show Israeli movies"
- [ ] Spanish command: "Mostrar películas israelíes"
- [ ] Language auto-detection works
- [ ] Mixed language handling (Hebrew + English words)
- [ ] TTS responds in same language as command

#### Complex Commands
- [ ] "Play Fauda season 2 episode 3" → Opens specific episode
- [ ] "Search for action movies from 2023" → Filtered search
- [ ] "Show me documentaries about Israel" → Category + keyword search
- [ ] "Continue watching where I left off" → Resume last content
- [ ] Command with multiple entities parsed correctly

#### Error Handling
- [ ] Unclear command → "Sorry, I didn't understand"
- [ ] No results found → "No content matches your search"
- [ ] Network error → "Unable to connect, please try again"
- [ ] Empty transcription → No action, remains listening
- [ ] Very long transcription → Truncated gracefully

### Emotional Intelligence Flows

#### Frustration Detection
- [ ] 3 failed commands → Frustration level increases
- [ ] 5 failed commands → Help suggestion offered
- [ ] TTS speed adjusts (slower for frustrated users)
- [ ] Response tone softens for high frustration
- [ ] Successful command resets frustration

#### Pattern Analysis
- [ ] Repeated search → Suggests browse instead
- [ ] Content not found → Suggests similar content
- [ ] Navigation loops → Offers direct path
- [ ] Analysis persists across sessions (web persistence)

### Avatar Flows

#### Mesh Avatar Generation
- [ ] **tvOS:** Screen accessible from settings
- [ ] **Web:** Screen accessible from profile
- [ ] **Mobile:** Screen accessible from profile
- [ ] Consent screen shows all 3 consent types
- [ ] PIN validation works (min 4 digits)
- [ ] Generation initiates successfully
- [ ] Polling updates status every 3 seconds
- [ ] Terminal state (ready/failed) stops polling
- [ ] Thumbnail loads when ready
- [ ] Error messages display correctly
- [ ] Retry works after failure

#### Avatar Display Modes
- [ ] **FULL mode:** Shows wizard + animations + waveform + transcript
- [ ] **COMPACT mode:** Shows wizard + waveform + transcript
- [ ] **MINIMAL mode:** Shows waveform + transcript (Web/Mobile)
- [ ] **ICON_ONLY mode:** Shows icon badge only
- [ ] Mode change applies immediately
- [ ] Mode persists across sessions
- [ ] TV scaling (1.4x) applies correctly (tvOS)
- [ ] Animations smooth and performant

### Settings Flows

#### Voice Settings
- [ ] Language change updates speech recognition
- [ ] TTS rate change applies to next response
- [ ] TTS volume change applies (web/mobile)
- [ ] Voice mode change activates correctly
- [ ] VAD sensitivity affects detection
- [ ] Silence threshold affects timeout
- [ ] Wake word enabled/disabled works
- [ ] Settings persist across sessions

#### Avatar Settings
- [ ] Display mode selection works
- [ ] Avatar preferences save
- [ ] Biometric consent can be revoked
- [ ] Consent revoke updates status

---

## E2E Testing Checklist

### Critical User Journeys

#### Journey 1: First Voice Command
**Starting Point:** Fresh app install, no voice usage
1. [ ] User opens app
2. [ ] User taps voice button (or says wake word)
3. [ ] Permission request appears (if first time)
4. [ ] User grants microphone permission
5. [ ] Voice listening indicator appears
6. [ ] User says "Play Fauda"
7. [ ] Transcription appears briefly
8. [ ] Processing indicator shows
9. [ ] TTS responds "Playing Fauda"
10. [ ] Player opens with Fauda
11. [ ] Playback begins
12. [ ] Command added to history

**Success Criteria:** Complete flow < 10 seconds, no errors

#### Journey 2: Mesh Avatar Creation
**Starting Point:** User has profile, no mesh avatar
1. [ ] User navigates to Avatar settings
2. [ ] User selects "Create Mesh Avatar"
3. [ ] Consent screen appears
4. [ ] User grants all 3 consents
5. [ ] User enters PIN
6. [ ] User taps "Generate"
7. [ ] Generation starts, status shows "processing"
8. [ ] Polling updates status every 3 seconds
9. [ ] After ~30-60 seconds, status becomes "ready"
10. [ ] Thumbnail preview loads
11. [ ] User can view 3D preview
12. [ ] User selects avatar display mode

**Success Criteria:** Complete generation < 2 minutes, preview loads

#### Journey 3: Emotional Intelligence Adaptation
**Starting Point:** User has voice enabled
1. [ ] User: "Show movies" → Success
2. [ ] User: "Find action" → No results
3. [ ] User: "Search action movies" → No results
4. [ ] User: "Where are action movies?" → No results (frustration = 0.7)
5. [ ] System detects frustration, TTS slower
6. [ ] System offers: "Would you like me to help you browse categories?"
7. [ ] User: "Yes"
8. [ ] System navigates to category browser
9. [ ] User successfully finds content
10. [ ] Frustration resets

**Success Criteria:** Help offered after 3-5 failures, tone adapts

#### Journey 4: Multi-Language Voice
**Starting Point:** User language set to Hebrew
1. [ ] User says "הצג סרטים" (Hebrew)
2. [ ] System recognizes Hebrew
3. [ ] TTS responds in Hebrew
4. [ ] User switches language to English
5. [ ] User says "Show movies"
6. [ ] System recognizes English
7. [ ] TTS responds in English
8. [ ] Both commands in history

**Success Criteria:** Correct language recognition, matching TTS

#### Journey 5: Proactive Suggestions
**Starting Point:** Friday 4 PM, user returns to app
1. [ ] User opens app
2. [ ] System detects Friday afternoon
3. [ ] After 5 seconds, proactive suggestion appears
4. [ ] TTS: "Shabbat is approaching! Would you like to watch candle lighting preparation?"
5. [ ] User can dismiss or accept
6. [ ] If accepted, navigates to Judaism section
7. [ ] If dismissed, suggestion clears

**Success Criteria:** Suggestion appears, TTS plays, actions work

### Cross-Platform Scenarios

#### Scenario 1: Settings Sync (Future: Cloud Sync)
**Note:** Currently local only, plan for future
1. [ ] User sets voice preferences on web
2. [ ] (Future) Settings sync to mobile
3. [ ] (Future) Settings sync to tvOS
4. [ ] Verify consistency across platforms

#### Scenario 2: Command History Across Platforms
**Note:** Currently local only, plan for future
1. [ ] User uses voice on mobile
2. [ ] (Future) Command history available on web
3. [ ] (Future) Emotional patterns persist

---

## Performance Testing Checklist

### Latency Measurements

| Metric | tvOS | Web | Mobile | Target | Pass/Fail |
|--------|------|-----|--------|--------|-----------|
| Voice activation time | - | - | - | < 300ms | - |
| Wake word detection | - | - | - | < 500ms | - |
| Speech recognition start | - | - | - | < 500ms | - |
| Transcription latency | - | - | - | < 1000ms | - |
| Backend API response | - | - | - | < 1000ms | - |
| TTS start time | - | - | - | < 300ms | - |
| Action execution | - | - | - | < 500ms | - |
| **Total (activation to action)** | - | - | - | **< 3500ms** | - |

### Resource Usage

#### Memory
| State | tvOS | Web | Mobile | Target | Pass/Fail |
|-------|------|-----|--------|--------|-----------|
| Idle (no voice) | - | - | - | < 50MB | - |
| Listening | - | - | - | < 80MB | - |
| Processing | - | - | - | < 100MB | - |
| Peak | - | - | - | < 120MB | - |

#### Battery (Mobile Only)
| Scenario | Duration | Battery Drain | Target | Pass/Fail |
|----------|----------|---------------|--------|-----------|
| Background listening | 1 hour | - | < 5% | - |
| Active voice use | 1 hour | - | < 8% | - |
| Mixed use | 1 hour | - | < 6% | - |

### Stress Testing

#### Long-Running Sessions
- [ ] 24-hour background listening (mobile)
  - Memory: _____ MB (stable?)
  - Battery: _____ % drained
  - Voice commands still work?
- [ ] 100 consecutive voice commands
  - All processed successfully?
  - Response time consistent?
  - Memory usage stable?
- [ ] 1000 commands in history
  - Performance impact?
  - Storage size: _____ KB

#### Network Conditions
- [ ] Voice command with slow 3G
  - Still completes?
  - Timeout appropriate?
- [ ] Voice command with network interruption
  - Error message shown?
  - Retry succeeds?
- [ ] Voice command offline
  - Error message clear?
  - Graceful degradation?

#### Concurrent Operations
- [ ] Voice command while video playing
  - Audio ducking works?
  - Voice recognition accurate?
- [ ] Multiple voice commands in quick succession
  - Queue handled correctly?
  - No dropped commands?
- [ ] Voice command during mesh generation
  - Both operations succeed?
  - No interference?

---

## Usability Testing Checklist

### 10-Foot UI Testing (tvOS)

#### Visual Clarity
- [ ] Text readable from 10 feet
- [ ] Icons recognizable from distance
- [ ] Colors have sufficient contrast
- [ ] Focus indicators clearly visible
- [ ] Status feedback (listening, processing) obvious

#### Remote Control Usability
- [ ] Menu button long-press comfortable
- [ ] Focus navigation intuitive
- [ ] Settings accessible within 3 clicks
- [ ] Error messages dismissible easily
- [ ] No dead-end navigation paths

### Desktop Browser Testing (Web)

#### Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

#### Interactions
- [ ] Keyboard shortcuts work
- [ ] Mouse click activates voice
- [ ] Visual feedback clear
- [ ] Settings accessible
- [ ] Responsive design works (tablet size)

### Mobile Device Testing

#### Devices
- [ ] iPhone 15 Pro (iOS 17)
- [ ] iPhone 13 (iOS 17)
- [ ] iPhone SE (iOS 17)
- [ ] Android device (optional, web only)

#### One-Handed Use
- [ ] Voice button reachable with thumb
- [ ] Settings accessible
- [ ] Gestures comfortable
- [ ] Text legible

#### Landscape Orientation
- [ ] Voice UI adapts to landscape
- [ ] Settings accessible
- [ ] Avatar display adjusts

### Accessibility Testing

#### Screen Readers
- [ ] **tvOS:** VoiceOver announces voice state
- [ ] **Web:** NVDA/JAWS announces correctly
- [ ] **Mobile:** VoiceOver/TalkBack works
- [ ] All interactive elements labeled
- [ ] Focus order logical

#### Visual Accessibility
- [ ] High contrast mode works (web)
- [ ] Text scaling works (1.0x - 2.0x)
- [ ] Color not sole indicator
- [ ] Focus indicators visible

#### Motor Accessibility
- [ ] Large touch targets (44x44 minimum)
- [ ] Dwell time configurable (where applicable)
- [ ] Alternative to long-press available

---

## Security & Privacy Testing

### Permission Handling
- [ ] Microphone permission requested appropriately
- [ ] Denied permission shows helpful message
- [ ] Restricted permission handled gracefully
- [ ] Permission status checked before activation

### Data Privacy
- [ ] Voice recordings not stored without consent
- [ ] Biometric data encrypted in transit
- [ ] PIN not logged
- [ ] Conversation history deletable
- [ ] Data export available (GDPR)

### Security
- [ ] API calls use authentication
- [ ] Sensitive data not in logs
- [ ] No XSS vulnerabilities
- [ ] No injection vulnerabilities
- [ ] Rate limiting prevents abuse

---

## Beta Testing Feedback

### Participant Information
- [ ] 50 participants per platform (150 total)
- [ ] Mix of user types (free, Beta 500)
- [ ] Diversity in age, tech proficiency
- [ ] Multiple languages represented

### Feedback Collection
- [ ] In-app survey after 1 week
- [ ] Bug reporting form available
- [ ] Weekly usage analytics
- [ ] Net Promoter Score (NPS)
- [ ] Feature satisfaction ratings

### Questions to Ask
1. How easy was it to activate voice commands? (1-5)
2. Were voice responses accurate? (1-5)
3. Did the emotional intelligence feel helpful? (1-5)
4. Would you use the mesh avatar? (Yes/No/Maybe)
5. What features did you use most?
6. What features need improvement?
7. Any bugs or issues encountered?
8. Would you recommend voice features to others? (NPS)

---

## Production Readiness Sign-Off

### Code Quality
- [ ] Test coverage ≥ 85% overall
- [ ] Zero critical bugs
- [ ] Zero high-severity bugs
- [ ] < 10 medium bugs (documented, non-blocking)
- [ ] Code reviewed by ≥ 2 reviewers per platform
- [ ] Static analysis passes

### Performance
- [ ] All latency targets met
- [ ] Memory usage within limits
- [ ] Battery impact acceptable
- [ ] No memory leaks detected
- [ ] Smooth animations (60fps)

### Accessibility
- [ ] WCAG 2.1 AA compliant (web)
- [ ] VoiceOver/TalkBack tested
- [ ] Keyboard navigation works
- [ ] High contrast mode works
- [ ] Text scaling works

### Security
- [ ] Security audit passed
- [ ] No sensitive data in logs
- [ ] Encryption configured
- [ ] Rate limiting active
- [ ] GDPR compliant

### Documentation
- [ ] User guides complete
- [ ] API docs complete
- [ ] Troubleshooting guide complete
- [ ] Release notes prepared
- [ ] Support team trained

### Sign-Offs
- [ ] Technical Lead: _________________ Date: _______
- [ ] QA Lead: _________________ Date: _______
- [ ] Product Manager: _________________ Date: _______
- [ ] Engineering Manager: _________________ Date: _______

---

**Testing Complete:** _____ / _____ / _____
**Approved for Production:** Yes / No
**Notes:**
