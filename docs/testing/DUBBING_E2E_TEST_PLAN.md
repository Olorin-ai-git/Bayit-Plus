# Real-Time Live Dubbing - End-to-End Test Plan

**Date:** 2026-01-23
**Status:** READY FOR TESTING
**Version:** 1.0

---

## Test Execution Overview

This test plan covers comprehensive validation of the live dubbing feature across all platforms and integration points.

### Test Phases

1. **Phase 1: Prerequisite Checks** (5 min)
   - Environment setup validation
   - Dependency verification
   - Configuration validation

2. **Phase 2: Backend Unit Tests** (15 min)
   - STT provider integration
   - Translation pipeline
   - TTS provider integration
   - Session management
   - Metering integration

3. **Phase 3: Frontend Unit Tests** (10 min)
   - Audio context initialization
   - WebSocket connection handling
   - Audio processing pipeline
   - Component rendering
   - State management hooks

4. **Phase 4: Integration Tests** (20 min)
   - Backend-to-frontend WebSocket communication
   - Audio pipeline end-to-end
   - Multi-user session isolation
   - Error recovery mechanisms

5. **Phase 5: Platform-Specific Tests** (30 min)
   - Web (Chrome, Firefox, Safari)
   - iOS (Simulator)
   - tvOS (Simulator)

6. **Phase 6: Performance & Load Tests** (15 min)
   - Latency measurements
   - Concurrent sessions
   - Resource utilization

---

## Phase 1: Prerequisite Checks

### 1.1 Environment Validation

**Required:**
- [ ] Node.js 18+ installed
- [ ] Python 3.11 installed
- [ ] Poetry installed and configured
- [ ] MongoDB Atlas connection available
- [ ] Redis/Memorystore available (for session state)

**Verification:**
```bash
# Node.js
node --version  # Should be v18+

# Python
python3 --version  # Should be 3.11+

# Poetry
poetry --version  # Should be 1.7+

# MongoDB connectivity
mongosh "YOUR_MONGODB_URI"

# Redis connectivity
redis-cli ping  # Should return PONG
```

### 1.2 Backend Setup

**Steps:**
```bash
cd backend
poetry install
poetry run pytest --collect-only  # Verify test discovery
```

**Verify:**
- [ ] All dependencies installed
- [ ] Test files discovered (90+ tests)
- [ ] No import errors

### 1.3 Frontend Setup

**Steps:**
```bash
cd web
npm install
npm run build  # Verify build succeeds
```

**Verify:**
- [ ] No build errors
- [ ] No TypeScript errors
- [ ] All dependencies installed

### 1.4 Configuration Validation

**Backend (.env):**
- [ ] VITE_API_URL configured
- [ ] MONGODB_URI valid
- [ ] SECRET_KEY set
- [ ] ELEVENLABS_API_KEY set

**Frontend (.env):**
- [ ] VITE_API_URL configured
- [ ] VITE_DUBBING_CONTEXT_SAMPLE_RATE set (default 48000)
- [ ] VITE_DUBBING_SERVER_SAMPLE_RATE set (default 16000)

---

## Phase 2: Backend Unit Tests

### 2.1 STT Provider Tests

**File:** `backend/tests/test_live_dubbing_service.py::TestSTT*`

**Test Cases:**
1. ✅ STT connection establishment
2. ✅ Audio chunk transmission
3. ✅ Transcript reception
4. ✅ Reconnection after failure
5. ✅ Cleanup on disconnect

**Command:**
```bash
poetry run pytest backend/tests/test_live_dubbing_service.py::TestSTT -v
```

**Expected:** All tests pass

### 2.2 Translation Pipeline Tests

**File:** `backend/tests/test_live_dubbing_service.py::TestTranslation*`

**Test Cases:**
1. ✅ Language pair validation
2. ✅ Text translation
3. ✅ Error handling for unsupported languages
4. ✅ Translation timeout

**Command:**
```bash
poetry run pytest backend/tests/test_live_dubbing_service.py::TestTranslation -v
```

**Expected:** All tests pass

### 2.3 TTS Provider Tests

**File:** `backend/tests/test_live_dubbing_service.py::TestTTS*`

**Test Cases:**
1. ✅ TTS connection establishment
2. ✅ PCM audio generation
3. ✅ Voice ID validation
4. ✅ Streaming audio delivery
5. ✅ Error handling for unavailable voices

**Command:**
```bash
poetry run pytest backend/tests/test_live_dubbing_service.py::TestTTS -v
```

**Expected:** All tests pass

### 2.4 Session Management Tests

**File:** `backend/tests/test_live_dubbing_service.py::TestSession*`

**Test Cases:**
1. ✅ Session creation
2. ✅ Session state transitions
3. ✅ Session cleanup
4. ✅ Multi-session isolation
5. ✅ Session recovery

**Command:**
```bash
poetry run pytest backend/tests/test_live_dubbing_service.py::TestSession -v
```

**Expected:** All tests pass (90%+ coverage)

### 2.5 Metering Integration Tests

**File:** `backend/tests/test_olorin_dubbing_service.py::TestMetering*`

**Test Cases:**
1. ✅ Usage recording
2. ✅ Billing event tracking
3. ✅ Cost calculation

**Command:**
```bash
poetry run pytest backend/tests/test_olorin_dubbing_service.py::TestMetering -v
```

**Expected:** All tests pass

---

## Phase 3: Frontend Unit Tests

### 3.1 React Hook Tests

**File:** `web/src/components/player/hooks/__tests__/useLiveDubbing.test.ts`

**Test Cases:**
1. ✅ Hook initialization
2. ✅ Connection state changes
3. ✅ Language switching
4. ✅ Volume adjustment
5. ✅ Cleanup on unmount

**Command:**
```bash
npm test -- useLiveDubbing.test.ts
```

**Expected:** All tests pass

### 3.2 Service Tests

**File:** `web/src/services/__tests__/liveDubbingService.test.ts`

**Test Cases:**
1. ✅ AudioContext creation
2. ✅ WebSocket connection
3. ✅ Audio capture startup
4. ✅ Message handling
5. ✅ Cleanup

**Command:**
```bash
npm test -- liveDubbingService.test.ts
```

**Expected:** All tests pass

### 3.3 Component Tests

**File:** `web/src/components/player/dubbing/__tests__/DubbingControls.test.tsx`

**Test Cases:**
1. ✅ Component rendering
2. ✅ Language selection
3. ✅ Toggle dubbing on/off
4. ✅ Error display
5. ✅ Accessibility attributes

**Command:**
```bash
npm test -- DubbingControls.test.tsx
```

**Expected:** All tests pass

---

## Phase 4: Integration Tests

### 4.1 WebSocket Communication

**Scenario:** Full WebSocket lifecycle

**Steps:**
1. Start backend server
2. Connect frontend WebSocket client
3. Send authentication
4. Receive connection confirmation
5. Exchange audio data
6. Receive dubbed audio
7. Close connection gracefully

**Expected Outcomes:**
- [ ] Connection establishes within 2 seconds
- [ ] Authentication succeeds
- [ ] Audio chunks transmitted (50+ per minute at 20fps)
- [ ] Dubbed audio received within latency budget (1200-1450ms)
- [ ] No connection drops during 5-minute session

### 4.2 Audio Pipeline End-to-End

**Scenario:** Full audio processing

**Steps:**
1. Capture video audio stream (48kHz, mono)
2. Send chunks to backend via WebSocket
3. Backend runs through: STT → Translation → TTS
4. Receive dubbed audio from backend
5. Play through Web Audio API
6. Measure latency at each stage

**Expected Outcomes:**
- [ ] Total latency: 950-1450ms (documented in latency_report)
- [ ] STT: 300-400ms
- [ ] Translation: 150-250ms
- [ ] TTS: 300-400ms
- [ ] Network: 100-200ms

### 4.3 Session Isolation

**Scenario:** Multiple users on same channel

**Steps:**
1. User A connects (target_language=en)
2. User B connects (target_language=es)
3. Both receive audio from same channel
4. Verify each receives own language translation
5. Both sessions isolated in database

**Expected Outcomes:**
- [ ] User A receives English dubbed audio
- [ ] User B receives Spanish dubbed audio
- [ ] No cross-user data leakage
- [ ] Both sessions tracked independently in MongoDB

### 4.4 Error Recovery

**Scenario:** Network failures and recovery

**Steps:**
1. Establish connection
2. Simulate network interruption (restart WebSocket)
3. Verify frontend attempts reconnection
4. Verify backend session cleanup
5. User can reconnect with new session

**Expected Outcomes:**
- [ ] Frontend reconnects within 5 seconds
- [ ] No orphaned sessions in database
- [ ] Users can resume without issues
- [ ] Error messages are clear and actionable

---

## Phase 5: Platform-Specific Tests

### 5.1 Web (Desktop Browsers)

**Browsers:** Chrome, Firefox, Safari

**Test Cases:**
1. ✅ AudioContext creation in each browser
2. ✅ WebSocket connection (WSS)
3. ✅ Audio capture via `captureStream()`
4. ✅ AudioWorklet processor loading
5. ✅ Keyboard navigation
6. ✅ Accessibility features (screen reader)
7. ✅ Glass component rendering

**Command:**
```bash
npm run test:web-browsers
```

### 5.2 iOS Simulator

**Test Cases:**
1. ✅ Audio session configuration (AVAudioSession)
2. ✅ Native audio playback module
3. ✅ Wi-Fi connectivity
4. ✅ Background audio handling
5. ✅ Focus ring on buttons

**Devices to Test:**
- iPhone SE (small screen)
- iPhone 15 (standard)
- iPhone 15 Pro Max (large screen)
- iPad (tablet)

**Command:**
```bash
cd mobile-app && npm run ios:simulator
```

### 5.3 tvOS Simulator

**Test Cases:**
1. ✅ Focus navigation (no traps)
2. ✅ Siri Remote gestures
3. ✅ Typography readable at 10 feet (29pt minimum)
4. ✅ Touch target sizes (80pt minimum)
5. ✅ Control panel layout

**Device:** Apple TV 4K, tvOS 17+

**Command:**
```bash
cd mobile-app && npm run tvos:simulator
```

---

## Phase 6: Performance & Load Tests

### 6.1 Latency Measurement

**Methodology:** Capture timestamps at each pipeline stage

**Metrics to Collect:**
- [ ] Audio capture delay: < 100ms
- [ ] STT latency: 300-400ms
- [ ] Translation latency: 150-250ms
- [ ] TTS latency: 300-400ms
- [ ] Network round-trip: 100-200ms
- [ ] Total end-to-end: 950-1450ms

**Command:**
```bash
poetry run pytest backend/tests/test_latency.py -v --durations=10
```

**Success Criteria:**
- [ ] 95th percentile latency < 1500ms
- [ ] 99th percentile latency < 2000ms
- [ ] No latency spike > 3000ms

### 6.2 Concurrent Sessions

**Scenario:** Multiple simultaneous users

**Test:** 10 concurrent sessions on same channel

**Metrics:**
- [ ] All sessions receive audio
- [ ] No session drops
- [ ] Latency remains stable
- [ ] Memory usage reasonable

**Command:**
```bash
poetry run pytest backend/tests/test_concurrent.py -v
```

### 6.3 Resource Utilization

**Metrics to Monitor:**
- [ ] CPU usage per session: < 15%
- [ ] Memory per session: < 50MB
- [ ] WebSocket bandwidth: < 100kbps
- [ ] Database query time: < 50ms

**Tools:**
```bash
# Monitor backend
docker stats bayit-plus-backend

# Monitor frontend
Chrome DevTools → Performance tab
```

---

## Test Results Template

### Test Execution Record

**Date:** _______________
**Tester:** _______________
**Environment:** Dev / Staging / Production

| Phase | Test Case | Status | Notes | Time |
|-------|-----------|--------|-------|------|
| 1.1 | Environment validation | ⬜ | | |
| 1.2 | Backend setup | ⬜ | | |
| 1.3 | Frontend setup | ⬜ | | |
| 1.4 | Configuration | ⬜ | | |
| 2.1 | STT provider tests | ⬜ | | |
| 2.2 | Translation tests | ⬜ | | |
| 2.3 | TTS provider tests | ⬜ | | |
| 2.4 | Session tests | ⬜ | | |
| 2.5 | Metering tests | ⬜ | | |
| 3.1 | Hook tests | ⬜ | | |
| 3.2 | Service tests | ⬜ | | |
| 3.3 | Component tests | ⬜ | | |
| 4.1 | WebSocket tests | ⬜ | | |
| 4.2 | Audio pipeline | ⬜ | | |
| 4.3 | Session isolation | ⬜ | | |
| 4.4 | Error recovery | ⬜ | | |
| 5.1 | Web browsers | ⬜ | | |
| 5.2 | iOS Simulator | ⬜ | | |
| 5.3 | tvOS Simulator | ⬜ | | |
| 6.1 | Latency tests | ⬜ | | |
| 6.2 | Concurrent sessions | ⬜ | | |
| 6.3 | Resource utilization | ⬜ | | |

### Summary

**Total Tests:** 22 phases
**Passed:** _____ ✅
**Failed:** _____ ❌
**Blocked:** _____ 🚫
**Pass Rate:** _____%

### Issues Found

| ID | Severity | Description | Status | Assigned To |
|----|----------|-------------|--------|-------------|
| | | | | |

### Sign-Off

**All critical tests passed:** ☐ Yes ☐ No
**Ready for production:** ☐ Yes ☐ No

**Tester Signature:** _________________________ **Date:** __________

**Reviewer Signature:** _______________________ **Date:** __________

---

## Known Issues & Blockers

### Critical Blocking Issues (From Agent Reviews)

1. **Frontend Glass Component Violation**
   - Status: ⚠️ MUST FIX
   - Location: `web/src/components/player/dubbing/DubbingControls.tsx`
   - Issue: Using `<Pressable>` instead of `GlassButton`
   - Impact: Violates design system requirement

2. **tvOS Typography Below Standard**
   - Status: ⚠️ MUST FIX
   - Location: Multiple files
   - Issue: 11-14pt text instead of required 29pt minimum
   - Impact: Unreadable from 10 feet (tvOS spec violation)

3. **Missing ChannelSTTManager**
   - Status: ⚠️ ARCHITECTURAL
   - Impact: N × API costs instead of optimized 1 × per channel
   - Mitigation: Phase 2 enhancement

4. **No Redis Session State**
   - Status: ⚠️ SCALABILITY
   - Impact: Cannot scale horizontally
   - Mitigation: Phase 2 enhancement

5. **Security: Unencrypted WebSocket**
   - Status: ⚠️ PRODUCTION BLOCKER
   - Issue: Using `ws://` instead of `wss://`
   - Impact: Audio transmission unencrypted

---

## Success Criteria

**All of the following must be true for "PRODUCTION READY":**

- [ ] All Phase 1-3 tests pass (unit & integration)
- [ ] Platform-specific tests pass (web, iOS, tvOS)
- [ ] End-to-end latency within budget (950-1450ms)
- [ ] Concurrent sessions stable (10+ without degradation)
- [ ] Error scenarios handled gracefully
- [ ] No memory leaks or resource leaks
- [ ] All accessibility standards met (WCAG AA)
- [ ] i18n working for all 7 languages
- [ ] Security audit issues resolved
- [ ] No blocking issues from agent reviews

---

## Testing Timeline

**Estimated Duration:** 2-3 hours for full test suite

**Recommended Schedule:**
- Phase 1: 5 min (setup)
- Phase 2: 15 min (backend unit tests)
- Phase 3: 10 min (frontend unit tests)
- Phase 4: 20 min (integration tests)
- Phase 5: 30 min (platform-specific)
- Phase 6: 15 min (performance tests)
- Documentation: 10 min

**Total:** ~105 minutes
