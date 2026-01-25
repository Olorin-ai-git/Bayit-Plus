# VideoPlayer Playback Session Test Suite

## Overview

Comprehensive test coverage for the Device Usage Limits Enforcement feature, including playback session management, concurrent stream limit enforcement, and user error handling.

## Test Files

### 1. usePlaybackSession.test.ts
**Type**: Unit Tests
**Coverage**: `usePlaybackSession` hook

**Test Categories**:
- **Session Creation** (6 tests)
  - Creates session when playback starts
  - Does not create when paused
  - Does not create when disabled
  - Does not create without contentId
  - Prevents duplicate sessions
  - Returns sessionId on success

- **Concurrent Stream Limit Enforcement** (2 tests)
  - Handles 403 error with limit exceeded
  - Calls onLimitExceeded callback with error details
  - Handles other API errors gracefully

- **Session Cleanup** (2 tests)
  - Ends session on unmount
  - Handles cleanup errors gracefully (no throw)

- **Manual Session Control** (2 tests)
  - Allows manual endSession() call
  - Does not attempt to end non-existent session

- **Content Change Handling** (1 test)
  - Creates new session when contentId changes
  - Ends old session before creating new one

- **Live vs VOD Content** (4 tests)
  - Handles live content type
  - Handles podcast content type
  - Handles radio content type
  - Validates content_type parameter in API call

**Total**: 17 unit tests

---

### 2. StreamLimitExceededModal.test.tsx
**Type**: Component Tests
**Coverage**: `StreamLimitExceededModal` component

**Test Categories**:
- **Rendering** (2 tests)
  - Renders when visible prop is true
  - Does not render when visible is false

- **Content Display** (5 tests)
  - Displays correct stream limit in message
  - Displays active device count
  - Renders list of active devices
  - Displays hint message
  - Shows all device names correctly

- **User Interactions** (2 tests)
  - Calls onClose when Cancel clicked
  - Navigates to /profile?tab=devices when Manage Devices clicked
  - Closes modal after Manage Devices action

- **Device Icon Selection** (5 tests)
  - Shows Smartphone icon for iPhone
  - Shows Smartphone icon for Android
  - Shows TV icon for Apple TV
  - Shows Tablet icon for iPad
  - Shows Monitor icon for desktop browsers

- **Multiple Active Devices** (2 tests)
  - Renders 4 devices for Family plan
  - Handles empty devices array

- **Subscription Tiers** (3 tests)
  - Displays Basic plan limit (1 stream)
  - Displays Premium plan limit (2 streams)
  - Displays Family plan limit (4 streams)

- **Accessibility** (3 tests)
  - Has warning modal type
  - Has accessible button labels
  - Truncates long device names (numberOfLines={1})

**Total**: 22 component tests

---

### 3. VideoPlayer.playback-session.integration.test.tsx
**Type**: Integration Tests
**Coverage**: End-to-end playback session flow

**Test Categories**:
- **Session Creation Flow** (3 tests)
  - Creates playback session when video starts
  - Validates API call with correct parameters
  - Does not create session for widget mode
  - Ends session when component unmounts

- **Concurrent Stream Limit Enforcement** (3 tests)
  - Shows modal when stream limit exceeded
  - Displays active devices in modal
  - Pauses video when limit exceeded
  - Closes modal when Cancel clicked

- **Live Content Handling** (1 test)
  - Creates session with content_type: 'live'
  - Validates live stream tracking

- **Podcast/Radio Content Handling** (2 tests)
  - Creates session with content_type: 'podcast'
  - Creates session with content_type: 'radio'

- **Error Recovery** (2 tests)
  - Handles network errors gracefully (no modal for 500 error)
  - Handles session cleanup errors without throwing
  - Player continues to function after errors

- **Multi-Device Scenarios** (2 tests)
  - Shows all active devices for Basic plan (1 stream)
  - Shows all active devices for Family plan (4 streams)
  - Validates device count matches subscription tier

**Total**: 13 integration tests

---

## Test Coverage Summary

| Test Type | File | Tests | Focus Area |
|-----------|------|-------|------------|
| Unit | usePlaybackSession.test.ts | 17 | Hook logic and API interactions |
| Component | StreamLimitExceededModal.test.tsx | 22 | UI rendering and user interactions |
| Integration | VideoPlayer.playback-session.integration.test.tsx | 13 | End-to-end flow |
| **TOTAL** | | **52** | **Complete feature coverage** |

---

## Test Execution

### Run All Tests
```bash
npm test -- src/components/player/__tests__
```

### Run Specific Test File
```bash
npm test -- usePlaybackSession.test.ts
npm test -- StreamLimitExceededModal.test.tsx
npm test -- VideoPlayer.playback-session.integration.test.tsx
```

### Run with Coverage
```bash
npm test -- src/components/player/__tests__ --coverage
```

### Watch Mode
```bash
npm test -- src/components/player/__tests__ --watch
```

---

## Expected Coverage Targets

| Metric | Target | Actual |
|--------|--------|--------|
| Statements | 90%+ | TBD |
| Branches | 85%+ | TBD |
| Functions | 90%+ | TBD |
| Lines | 90%+ | TBD |

---

## Test Scenarios Covered

### ✅ Session Lifecycle
- [x] Session creation on playback start
- [x] Session cleanup on unmount
- [x] Manual session termination
- [x] Session creation prevented when disabled/paused
- [x] Duplicate session prevention

### ✅ Concurrent Stream Enforcement
- [x] 403 error handling
- [x] Active devices display
- [x] Video pause on limit exceeded
- [x] Error callback invocation
- [x] Modal display with device list

### ✅ Content Type Support
- [x] VOD (Video on Demand)
- [x] Live streaming
- [x] Podcast episodes
- [x] Radio stations

### ✅ Subscription Tiers
- [x] Basic plan (1 concurrent stream)
- [x] Premium plan (2 concurrent streams)
- [x] Family plan (4 concurrent streams)

### ✅ Device Detection
- [x] Smartphone (iPhone, Android)
- [x] Tablet (iPad)
- [x] TV (Apple TV, Roku)
- [x] Desktop (Chrome, Safari, Firefox)

### ✅ User Interactions
- [x] Cancel button closes modal
- [x] Manage Devices navigates to /profile?tab=devices
- [x] Long device names truncated

### ✅ Error Handling
- [x] Network errors (5xx)
- [x] API errors (non-403)
- [x] Cleanup failures
- [x] Missing contentId

### ✅ Edge Cases
- [x] Widget mode (no session tracking)
- [x] Empty devices array
- [x] Content change (new session creation)
- [x] Unmount during session creation

---

## Mocked Dependencies

### Axios
- `axios.post()` - Mocked for API calls
- Returns mock session data or 403 error

### Device Service
- `deviceService.generateDeviceId()` - Returns 'test-device-id'
- `deviceService.getDeviceInfo()` - Returns mock device metadata

### Auth Store
- `useAuthStore()` - Returns mock user with Premium subscription
- User ID: 'test-user-123'
- Max concurrent streams: 2

### React Router
- `useNavigate()` - Mocked for navigation tracking
- Verifies navigation to /profile?tab=devices

### i18next
- `useTranslation()` - Returns mock t() function
- Supports parameter interpolation ({{maxStreams}}, {{count}})

---

## CI/CD Integration

### Pre-commit Hook
```bash
npm test -- src/components/player/__tests__ --bail --findRelatedTests
```

### GitHub Actions Workflow
```yaml
- name: Run Playback Session Tests
  run: npm test -- src/components/player/__tests__ --coverage
```

### Coverage Threshold Enforcement
```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "statements": 90,
        "branches": 85,
        "functions": 90,
        "lines": 90
      }
    }
  }
}
```

---

## Future Test Enhancements

### E2E Tests (Playwright)
- [ ] Full user flow: Login → Play video → Exceed limit → Navigate to devices
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile device testing (iOS Safari, Chrome Android)

### Load Tests
- [ ] 1000 concurrent users with session creation
- [ ] Heartbeat endpoint under load
- [ ] Session cleanup performance

### Visual Regression Tests
- [ ] StreamLimitExceededModal screenshot comparison
- [ ] Device icons rendering
- [ ] RTL layout (Hebrew, Arabic)

---

## Test Maintenance

### When to Update Tests
- New subscription tier added
- Device detection logic changes
- API endpoint URL changes
- Error message format changes
- i18n translation keys modified

### Test Review Checklist
- [ ] All tests pass in CI/CD
- [ ] Coverage meets 90%+ threshold
- [ ] No flaky tests (run 10 times)
- [ ] Tests run in < 30 seconds
- [ ] Mock data matches production API format
