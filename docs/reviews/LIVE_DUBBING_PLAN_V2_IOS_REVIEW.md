# iOS Developer Review: Live Dubbing Implementation Plan v2.0

**Review Date**: 2026-01-23
**Reviewer**: iOS Developer Agent
**Plan Document**: `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/docs/plans/LIVE_DUBBING_IMPLEMENTATION_PLAN_V2.md`
**Status**: ⚠️ **CHANGES REQUIRED**

---

## Executive Summary

The Live Dubbing Implementation Plan v2.0 has significant iOS-specific concerns that require resolution before implementation. While the plan includes iOS native module specifications and audio session management, there are **critical gaps** in iOS audio architecture, permission requirements, and testing specifications that make the plan non-viable for iOS devices.

**Critical Issues Identified**:
1. **Audio Input Architecture Mismatch**: Plan specifies WebSocket audio capture at 48kHz PCM from "microphone," but live channels do NOT need microphone access - they use HLS stream audio
2. **Microphone Permission Already Exists**: NSMicrophoneUsageDescription is for "Hey Bayit" voice commands, NOT for dubbing
3. **Existing Native Module vs. Plan Specification**: Codebase already has `LiveDubbingAudioModule.swift` using **Base64 MP3**, but plan specifies **raw PCM 48kHz** - architectural conflict
4. **Missing iOS Audio Format Conversion**: No specification for converting HLS stream audio to 48kHz PCM for WebSocket transmission
5. **Dynamic Type and VoiceOver Testing**: Not specified for iOS accessibility compliance
6. **iOS 16-18 Version Testing Matrix**: Missing comprehensive device/OS version test plan

---

## 1. Audio Architecture Analysis

### 1.1 Current Implementation (Existing Codebase)

**File**: `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/mobile-app/ios/BayitPlus/LiveDubbingAudioModule.swift`

```swift
// CURRENT: Plays Base64-encoded MP3 audio from backend
@objc func playAudio(_ base64Audio: String, ...)

// Audio format: MP3 decoded to PCM via AVAudioFile
// Uses AVAudioEngine + AVAudioPlayerNode
// Sample rate: Matches engine output format (typically 48kHz)
```

**Key Characteristics**:
- ✅ Receives **Base64 MP3** from WebSocket (already implemented)
- ✅ Decodes MP3 to PCM in-memory
- ✅ Uses AVAudioEngine for playback
- ✅ Handles audio interruptions (phone calls, Siri)
- ✅ Volume control for dubbed audio
- ✅ Thread-safe with NSLock

### 1.2 Plan Specification (Section 8.3)

**File**: Plan Section 8.3 - iOS Native Module (Swift Bridge)

```swift
// PLAN: Plays raw PCM Float32 samples
@objc func playPCMAudio(_ pcmData: [NSNumber], ...)

// Audio format: Raw PCM 48kHz mono Float32 array
// Manual buffer creation from Float32 samples
// Expects PCM directly from WebSocket
```

**Key Differences**:
- ❌ Expects **raw PCM Float32 array** from WebSocket
- ❌ Manual AVAudioPCMBuffer creation from Float samples
- ❌ No format conversion logic
- ❌ Different API signature (`playPCMAudio` vs `playAudio`)

### 1.3 Critical Conflict

**ISSUE**: The existing implementation and plan specification are **architecturally incompatible**.

| Aspect | Existing Implementation | Plan Specification | Impact |
|--------|------------------------|-------------------|---------|
| **Audio Format** | Base64 MP3 | Raw PCM Float32 | Breaking change |
| **Method Name** | `playAudio(base64Audio:)` | `playPCMAudio(pcmData:)` | API incompatibility |
| **Decoding** | In-module MP3 → PCM | Pre-decoded by backend | Architectural shift |
| **Data Size** | ~10KB per chunk (MP3 compressed) | ~200KB per chunk (PCM uncompressed) | 20x bandwidth increase |
| **Latency** | +80-150ms MP3 decode | Lower decode latency | Tradeoff needs analysis |

**RECOMMENDATION**: **Choose ONE approach and update ALL components consistently**:

**Option A: Keep Base64 MP3 (Existing)**
- ✅ Already implemented and tested
- ✅ Lower bandwidth usage
- ✅ Proven to work with existing backend
- ❌ +80-150ms decode latency per chunk

**Option B: Switch to Raw PCM (Plan)**
- ✅ Lower decode latency
- ✅ Simpler iOS implementation
- ❌ 20x bandwidth increase
- ❌ Requires backend changes
- ❌ Untested in production

**MY RECOMMENDATION**: **Option A (Keep Base64 MP3)** unless latency tests prove PCM is required. Update plan to match existing implementation.

---

## 2. Audio Capture from HLS Stream (NOT Microphone)

### 2.1 Misunderstanding in Plan

**Section 1.1 Architecture Diagram** states:
```
│  │  │ Audio Capture    │────▶│ WebSocket     │  │  │
│  │  │ 48kHz PCM Mono   │     │ Client        │  │  │
```

**CRITICAL ISSUE**: This implies capturing audio from **microphone**, but live channel dubbing captures audio from the **HLS video stream being played**, not the device microphone.

**Microphone is ONLY used for**:
- "Hey Bayit" wake word detection
- Voice commands to control playback

**Dubbing audio source**:
- ✅ HLS stream audio track (Hebrew channel audio)
- ❌ NOT device microphone

### 2.2 iOS Audio Capture Implementation Required

**MISSING FROM PLAN**: How to capture audio from the playing HLS stream on iOS.

**Required Implementation** (not in plan):

```swift
// ios-app/BayitPlus/Audio/HLSAudioCaptureModule.swift (NEW)

import AVFoundation
import React

@objc(HLSAudioCaptureModule)
class HLSAudioCaptureModule: RCTEventEmitter {

    private var audioEngine: AVAudioEngine?
    private var audioTap: AVAudioPlayerNode?
    private var captureBuffer: AVAudioPCMBuffer?

    // Tap into AVPlayer audio output
    func attachAudioTap(to player: AVPlayer) {
        // Use AVAudioEngine to tap audio from AVPlayer
        // Convert to 48kHz PCM mono
        // Send via WebSocket to backend
    }

    // Emit captured PCM chunks to React Native
    override func supportedEvents() -> [String]! {
        return ["onAudioChunkCaptured"]
    }

    func sendAudioChunk(_ pcmData: Data) {
        sendEvent(withName: "onAudioChunkCaptured", body: ["data": pcmData.base64EncodedString()])
    }
}
```

**PLAN MUST SPECIFY**:
1. How to attach audio tap to AVPlayer (HLS stream playback)
2. Audio format conversion from HLS codec to 48kHz PCM mono
3. Buffering strategy for real-time transmission
4. Error handling if audio tap fails
5. Impact on video playback performance

**Current Info.plist** (already has microphone permission):
```xml
<key>NSMicrophoneUsageDescription</key>
<string>Bayit+ needs microphone access for voice commands and "Hey Bayit" wake word detection.</string>
```

**NO CHANGE NEEDED**: Microphone permission is for voice commands, NOT dubbing. Dubbing does NOT need microphone access.

---

## 3. Native Module API Gap Analysis

### 3.1 Existing API (LiveDubbingAudioModule.swift)

```swift
// Playback
@objc func playAudio(_ base64Audio: String, resolve:, reject:)
@objc func stop(_ resolve:, reject:)
@objc func cleanup(_ resolve:, reject:)

// Volume Control
@objc func setDubbedVolume(_ volume: Double, resolve:, reject:)
@objc func setOriginalVolume(_ volume: Double, resolve:, reject:)

// Status
@objc func isPlaying(_ resolve:, reject:)
```

### 3.2 Plan API (Section 8.3)

```swift
// Initialization
@objc func initialize(_ resolve:, rejecter reject:)

// Playback
@objc func playPCMAudio(_ pcmData: [NSNumber], resolver:, rejecter:)
@objc func stop(_ resolve:, rejecter:)

// Volume Control
@objc func setMixVolumes(_ originalVol: NSNumber, dubbedVol: NSNumber, resolver:, rejecter:)
```

### 3.3 API Differences

| Feature | Existing API | Plan API | Action Required |
|---------|--------------|----------|-----------------|
| **Initialization** | Auto (in init()) | Explicit `initialize()` | Decide: Keep auto or add explicit? |
| **Audio Format** | Base64 MP3 string | PCM Float32 array | **CRITICAL: Choose one** |
| **Volume Control** | Separate methods | Combined `setMixVolumes()` | Decide: Keep separate or combine? |
| **Cleanup** | Explicit `cleanup()` | None | Keep explicit cleanup |
| **Status** | `isPlaying()` | None | Keep status check |
| **Events** | None | `onDubbingAudioLevel`, `onDubbingError`, `onDubbingStateChange` | Add events if needed |

**PLAN MUST**:
1. Reconcile API differences OR explicitly deprecate existing module
2. If replacing, provide migration path for existing integrations
3. Update React Native TypeScript types to match native API

---

## 4. Audio Session Configuration Review

### 4.1 Existing Audio Session (AudioSessionManager.swift)

```swift
// Current configuration
try audioSession.setCategory(
    .playback,
    mode: .spokenAudio,  // Optimized for voice
    options: [.duckOthers]  // iOS
)
```

### 4.2 Plan Audio Session (Section 4.1)

```swift
// Plan configuration
try session.setCategory(
    .playback,
    mode: .moviePlayback,  // Optimized for video
    options: [.allowAirPlay, .allowBluetooth, .mixWithOthers]
)
```

### 4.3 Analysis

**Key Differences**:

| Setting | Existing | Plan | Recommendation |
|---------|----------|------|----------------|
| **Mode** | `.spokenAudio` | `.moviePlayback` | ✅ **Use `.moviePlayback`** - dubbing is synchronized with video |
| **Options (iOS)** | `.duckOthers` | `.allowAirPlay, .allowBluetooth, .mixWithOthers` | ⚠️ **Do NOT use `.mixWithOthers`** - will mix with other apps (music playing in background) |
| **Sample Rate** | Default | 48000 Hz | ✅ **Set preferred 48kHz** |

**CORRECTED Audio Session Configuration**:

```swift
// ios-app/BayitPlus/Audio/DubbingAudioSessionManager.swift

func configureForLiveDubbing() throws {
    let session = AVAudioSession.sharedInstance()

    #if os(iOS)
    try session.setCategory(
        .playback,
        mode: .moviePlayback,
        options: [.allowAirPlay, .allowBluetooth, .duckOthers]
        // NOTE: .mixWithOthers removed to prevent mixing with background music
    )
    #elseif os(tvOS)
    try session.setCategory(
        .playback,
        mode: .moviePlayback,
        options: [.allowAirPlay, .allowBluetoothA2DP]
    )
    #endif

    // Set preferred sample rate for dubbing
    try session.setPreferredSampleRate(48000)

    // Activate session
    try session.setActive(true)
}
```

**PLAN UPDATE REQUIRED**: Remove `.mixWithOthers` from iOS audio session options.

---

## 5. iOS Testing Requirements (MISSING FROM PLAN)

### 5.1 Required Device Testing Matrix

**Section 6.3 E2E Tests** only specifies Playwright (web) tests. **iOS testing is MISSING**.

**REQUIRED iOS TESTING MATRIX**:

| Device | iOS Version | Screen Size | Orientation | Dynamic Type | VoiceOver |
|--------|-------------|-------------|-------------|--------------|-----------|
| **iPhone SE (3rd gen)** | 16.0 | 375x667 pt | Portrait, Landscape | 1x, 1.5x, 2x | ON/OFF |
| **iPhone 15** | 17.0 | 393x852 pt | Portrait, Landscape | 1x, 1.5x, 2x | ON/OFF |
| **iPhone 15 Pro** | 18.0 | 393x852 pt | Portrait, Landscape | 1x, 1.5x, 2x | ON/OFF |
| **iPhone 15 Pro Max** | 18.0 | 430x932 pt | Portrait, Landscape | 1x, 1.5x, 2x | ON/OFF |
| **iPad (10th gen)** | 17.0 | 1080x810 pt | Portrait, Landscape | 1x, 1.5x | ON/OFF |
| **iPad Pro 12.9"** | 18.0 | 1366x1024 pt | Portrait, Landscape | 1x, 1.5x | ON/OFF |

**Total Test Combinations**: 6 devices × 2 orientations × 3 Dynamic Type scales × 2 VoiceOver states = **72 test scenarios minimum**

### 5.2 iOS-Specific Test Cases (NEW)

**PLAN MUST ADD**:

```swift
// tests/ios/LiveDubbingTests.swift

class LiveDubbingTests: XCTestCase {

    // MARK: - Audio Session Tests

    func testAudioSessionConfigured48kHz() {
        // Verify audio session uses 48kHz sample rate
    }

    func testAudioSessionInterruption() {
        // Simulate phone call interruption
        // Verify dubbing pauses and resumes
    }

    func testAudioSessionRouteChange() {
        // Simulate headphones unplug
        // Verify dubbing handles route change
    }

    // MARK: - Volume Control Tests

    func testVolumeControlRange() {
        // Verify volume 0.0 to 1.0 clamping
    }

    func testOriginalAndDubbedVolumeMixing() {
        // Verify simultaneous playback of original + dubbed
    }

    // MARK: - Audio Latency Tests

    func testAudioSyncDelay1200ms() {
        // Verify dubbed audio plays 1200ms after capture
    }

    func testAudioSyncDrift() {
        // Verify no drift over 1-hour session
    }

    // MARK: - Memory Tests

    func testMemoryLeaksAfter1000Chunks() {
        // Play 1000 audio chunks and verify no leaks
    }

    func testBackgroundMemoryPressure() {
        // Simulate low memory warning
        // Verify graceful cleanup
    }

    // MARK: - Accessibility Tests

    func testVoiceOverLabelsAllControls() {
        // Verify all dubbing controls have accessibility labels
    }

    func testDynamicTypeScaling() {
        // Verify UI scales with Dynamic Type 1x to 2x
    }

    // MARK: - Lifecycle Tests

    func testAppBackgroundForeground() {
        // Verify dubbing resumes after app background/foreground
    }

    func testSessionCleanupOnDisconnect() {
        // Verify resources released on WebSocket disconnect
    }
}
```

### 5.3 Screenshot Requirements (MISSING)

**PLAN MUST REQUIRE**:
1. Screenshots of dubbing UI on ALL device sizes (iPhone SE → iPad Pro)
2. Screenshots with dubbing ACTIVE and INACTIVE states
3. Screenshots in Hebrew (RTL) and English (LTR) layouts
4. Screenshots with VoiceOver focus indicators visible
5. Screenshots with Dynamic Type 2x (maximum text scaling)

**Automation**:
```bash
# ios-app/scripts/capture_dubbing_screenshots.sh
xcodebuild test \
  -scheme BayitPlus \
  -destination 'platform=iOS Simulator,name=iPhone SE (3rd generation)' \
  -resultBundlePath ./test-results/iphone-se \
  -enableCodeCoverage YES

# Screenshots saved to test-results/*/Attachments/Screenshot_*.png
```

---

## 6. StyleSheet Compliance Review

### 6.1 Plan Components (Section 4.2)

**File**: `tvos-app/components/player/dubbing/TVDubbingControls.tsx`

```tsx
const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 20,  // ⚠️ iOS < 14.5 does not support 'gap' in StyleSheet
  },
  // ... other styles
});
```

**ISSUE**: `gap` property in `StyleSheet.create()` requires iOS 14.5+ and React Native 0.71+. Plan does not specify minimum iOS version.

**VERIFICATION REQUIRED**:
- Check `mobile-app/ios/Podfile` for minimum iOS deployment target
- If iOS < 14.5 is supported, replace `gap` with explicit margins

**RECOMMENDATION**: Set minimum iOS version to **16.0** (aligns with plan's audio session APIs).

### 6.2 Glass Component Usage

**Plan correctly uses Glass components**:
- ✅ `GlassButton` for dubbing toggle
- ✅ `GlassSlider` for volume control
- ✅ `GlassModal` for dubbing settings
- ✅ `GlassCard` for tvOS dubbing controls

**NO ISSUES**: Plan follows Glass component library correctly.

---

## 7. Accessibility Requirements (PARTIALLY MISSING)

### 7.1 VoiceOver Labels (Plan)

**Section 4.2** includes:
```tsx
<TVSwitch
  accessibilityLabel={t('player.dubbing.toggleLabel')}
/>
```

**✅ GOOD**: Plan includes `accessibilityLabel` for controls.

### 7.2 MISSING iOS Accessibility Features

**PLAN MUST ADD**:

1. **Accessibility Traits**:
```tsx
<GlassButton
  accessibilityLabel="Enable Dubbing"
  accessibilityRole="button"
  accessibilityState={{ checked: isDubbingActive }}  // For toggles
  accessibilityHint="Activates real-time voice translation"
/>
```

2. **Dynamic Type Support**:
```tsx
import { useAccessibilityInfo } from 'react-native';

const { isBoldTextEnabled, isScreenReaderEnabled } = useAccessibilityInfo();

// Adjust typography based on Dynamic Type
const fontSize = baseFontSize * (isBoldTextEnabled ? 1.2 : 1.0);
```

3. **VoiceOver Focus Order**:
```tsx
// Ensure logical focus order: Enable Toggle → Language Selector → Volume Control
<View
  accessible={true}
  accessibilityViewIsModal={true}  // Modal focus within dubbing panel
>
  {/* Controls */}
</View>
```

4. **Reduce Motion Support**:
```tsx
import { AccessibilityInfo } from 'react-native';

const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
const animationDuration = isReduceMotionEnabled ? 0 : 300;
```

**PLAN UPDATE REQUIRED**: Add comprehensive iOS accessibility implementation.

---

## 8. Performance and Memory Considerations

### 8.1 Existing Implementation (GOOD)

**File**: `LiveDubbingAudioModule.swift`

```swift
// ✅ GOOD: Thread-safe audio queue management
private let audioQueueLock = NSLock()

// ✅ GOOD: Async audio processing on background queue
DispatchQueue.global(qos: .userInteractive).async { ... }

// ✅ GOOD: Proper memory cleanup
defer { try? FileManager.default.removeItem(at: tempURL) }

// ✅ GOOD: Completion handler for buffer lifecycle
playerNode?.scheduleBuffer(buffer, at: nil, options: []) { [weak self] in
    // Buffer playback complete - memory released
}
```

**NO ISSUES**: Existing implementation follows iOS best practices.

### 8.2 Plan Considerations

**Section 1.2 Latency Budget**:
```
├── Audio capture/buffering:    50-100ms
├── STT (with VAD timeout):    300-400ms
├── Translation:               150-250ms
├── TTS first chunk:           300-400ms
├── Network (round-trip):      100-200ms
└── Decode/playback setup:      50-100ms
────────────────────────────────────────
TOTAL:                         950-1450ms
```

**iOS-Specific Additions**:
- AVAudioEngine startup: +20-50ms (first time)
- MP3 decoding (if Base64 MP3): +80-150ms per chunk
- Audio route change handling: +50-100ms (e.g., AirPods connect)

**UPDATED TOTAL for iOS**: **1100-1750ms**

**RECOMMENDATION**: Increase `sync_delay_ms` to **1500ms** for iOS to account for audio session overhead.

---

## 9. WebSocket Binary Protocol (iOS Considerations)

### 9.1 Plan WebSocket Messages

**Section 2.5** specifies:
```json
// Text message (auth)
{
  "type": "auth",
  "token": "...",
  "timestamp": 1234567890,
  "target_lang": "en"
}

// Binary message (dubbed audio)
// Format: raw PCM 48kHz or Base64 MP3
```

### 9.2 iOS Binary WebSocket Handling

**REQUIRED IMPLEMENTATION** (not in plan):

```swift
// shared/services/dubbing/WebSocketConnection.native.ts

import { NativeModules } from 'react-native';
const { LiveDubbingWebSocketModule } = NativeModules;

class WebSocketConnectionIOS {
    connect(url: string, authToken: string) {
        // Use native URLSessionWebSocketTask for binary support
        return LiveDubbingWebSocketModule.connect(url, authToken);
    }

    onBinaryMessage(callback: (data: ArrayBuffer) => void) {
        // Native module emits binary data as Base64 string
        // Convert to Uint8Array for processing
    }
}
```

**PLAN MUST SPECIFY**:
- Native WebSocket module for binary message handling
- Data encoding/decoding strategy (ArrayBuffer ↔ Base64)
- Error handling for binary message parsing failures

---

## 10. iOS Simulator Testing Limitations

### 10.1 Known Simulator Issues

**Simulator CANNOT test**:
1. **Audio interruptions**: Phone calls, Siri activation
2. **Audio route changes**: Bluetooth headphones, AirPods, speaker switching
3. **Background audio**: App backgrounding with audio playback
4. **Real network latency**: Simulator uses host network (faster than device)

**PLAN MUST REQUIRE**:
- Physical device testing for ALL audio-related features
- TestFlight beta distribution for external testers
- Automated device farm testing (e.g., Firebase Test Lab, AWS Device Farm)

### 10.2 Required Physical Device Tests

**Minimum Physical Device Coverage**:
- 1x iPhone SE (iOS 16) - Small screen, older hardware
- 1x iPhone 15 Pro (iOS 18) - Latest hardware, new APIs
- 1x iPad Pro 12.9" (iOS 17) - Large screen, multitasking

**Test Scenarios on Physical Devices**:
1. Enable dubbing → Receive phone call → Resume dubbing
2. Enable dubbing → Connect Bluetooth headphones → Verify audio routing
3. Enable dubbing → Lock screen → Unlock → Verify dubbing resumes
4. Enable dubbing → App background 5 minutes → Foreground → Verify reconnection
5. Enable dubbing → Switch to another app → Return → Verify state preserved

---

## 11. Critical Issues Summary

### 11.1 Blocking Issues (MUST FIX BEFORE APPROVAL)

| # | Issue | Impact | Recommendation |
|---|-------|--------|----------------|
| 1 | **Audio input source confusion** | Plan implies microphone capture, but dubbing uses HLS stream audio | ✅ **Clarify: HLS stream audio capture, NOT microphone** |
| 2 | **Base64 MP3 vs PCM conflict** | Existing module uses MP3, plan specifies PCM | ⚠️ **Choose ONE: Keep MP3 OR migrate to PCM (affects backend)** |
| 3 | **Missing HLS audio tap implementation** | No specification for capturing audio from AVPlayer | ❌ **ADD: HLS audio capture module specification** |
| 4 | **iOS testing matrix missing** | No iOS device/version/accessibility test plan | ❌ **ADD: Comprehensive iOS test matrix (72+ scenarios)** |
| 5 | **Native module API mismatch** | Existing API != Plan API | ⚠️ **Reconcile APIs OR provide migration path** |

### 11.2 High-Priority Issues (SHOULD FIX)

| # | Issue | Impact | Recommendation |
|---|-------|--------|----------------|
| 6 | **Audio session `.mixWithOthers`** | Will mix with background music (incorrect behavior) | ✅ **REMOVE `.mixWithOthers` from iOS config** |
| 7 | **Missing accessibility features** | Incomplete VoiceOver, Dynamic Type, Reduce Motion support | ❌ **ADD: Full iOS accessibility implementation** |
| 8 | **Latency budget iOS overhead** | Plan assumes 950-1450ms, but iOS adds +150-300ms | ⚠️ **Increase sync_delay_ms to 1500ms for iOS** |
| 9 | **Physical device testing** | Simulator cannot test audio interruptions, route changes | ❌ **REQUIRE: Physical device testing before GA** |
| 10 | **Screenshot automation** | No iOS screenshot capture automation specified | ❌ **ADD: XCTest UI screenshot automation** |

### 11.3 Medium-Priority Issues (NICE TO HAVE)

| # | Issue | Impact | Recommendation |
|---|-------|--------|----------------|
| 11 | **Binary WebSocket native module** | React Native WebSocket may not handle binary efficiently | ⚠️ **Consider: Native URLSessionWebSocketTask module** |
| 12 | **StyleSheet `gap` property** | Requires iOS 14.5+, plan doesn't specify min version | ✅ **Set minimum iOS 16.0 deployment target** |
| 13 | **Audio format conversion docs** | Missing HLS codec → 48kHz PCM conversion details | ❌ **ADD: Audio conversion pipeline documentation** |

---

## 12. Required Plan Updates

### 12.1 Section 1.1 Architecture Diagram

**CHANGE**:
```diff
- │  │  │ Audio Capture    │────▶│ WebSocket     │  │  │
- │  │  │ 48kHz PCM Mono   │     │ Client        │  │  │
+ │  │  │ HLS Stream Tap   │────▶│ PCM Converter │────▶│ WebSocket     │  │  │
+ │  │  │ (Video Audio)    │     │ 48kHz Mono    │     │ Client        │  │  │
```

**ADD**:
```
AUDIO CAPTURE CLARIFICATION:
- iOS/tvOS: HLS stream audio via AVAudioEngine tap (NOT microphone)
- Web: MediaElementAudioSourceNode from <video> element
- Microphone permission NOT required for dubbing (only for "Hey Bayit" voice commands)
```

### 12.2 Section 4.1 iOS Audio Session

**CHANGE**:
```diff
  try session.setCategory(
      .playback,
      mode: .moviePlayback,
-     options: [.allowAirPlay, .allowBluetooth, .mixWithOthers]
+     options: [.allowAirPlay, .allowBluetooth, .duckOthers]
  )
```

### 12.3 Section 6.0 Testing Strategy (NEW iOS Section)

**ADD**:
```markdown
### 6.4 iOS Native Testing

#### Device Matrix
- iPhone SE (3rd gen) - iOS 16.0
- iPhone 15 - iOS 17.0
- iPhone 15 Pro - iOS 18.0
- iPhone 15 Pro Max - iOS 18.0
- iPad (10th gen) - iOS 17.0
- iPad Pro 12.9" - iOS 18.0

#### Test Scenarios (per device)
- [ ] Portrait and Landscape orientations
- [ ] Dynamic Type 1x, 1.5x, 2x scaling
- [ ] VoiceOver ON and OFF
- [ ] Audio interruptions (phone call, Siri)
- [ ] Audio route changes (Bluetooth, headphones)
- [ ] App backgrounding with dubbing active
- [ ] Memory profiling (1-hour session)
- [ ] Network interruption recovery

#### Physical Device Requirements
- Minimum 3 physical devices for beta testing
- TestFlight distribution for external testers
- Automated device farm testing (Firebase Test Lab)

#### Screenshot Automation
```bash
xcodebuild test \
  -scheme BayitPlus \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  -resultBundlePath ./screenshots/ios
```
```

### 12.4 Section 8.3 iOS Native Module

**DECISION REQUIRED**: Choose ONE audio format approach:

**OPTION A: Keep Base64 MP3 (Existing)**
```swift
// ios-app/BayitPlus/Dubbing/AudioDubbingModule.swift
@objc func playAudio(_ base64Audio: String, ...)
// Backend sends: Base64-encoded MP3 chunks
// iOS decodes: MP3 → PCM in-memory
```

**OPTION B: Switch to Raw PCM (Plan)**
```swift
// ios-app/BayitPlus/Dubbing/AudioDubbingModule.swift
@objc func playPCMAudio(_ pcmData: [NSNumber], ...)
// Backend sends: Raw PCM Float32 array
// iOS plays: Direct PCM buffer (no decode)
// Backend changes: ElevenLabs API response handling
```

**PLAN MUST SPECIFY**: Which option is chosen and update ALL affected sections.

### 12.5 Section 8.6 HLS Audio Capture Module (NEW)

**ADD**:
```markdown
### 8.6 HLS Audio Capture Module (iOS/tvOS)

iOS dubbing requires capturing audio from the HLS stream being played (NOT microphone).

```swift
// ios-app/BayitPlus/Dubbing/HLSAudioCaptureModule.swift

import AVFoundation
import React

@objc(HLSAudioCaptureModule)
class HLSAudioCaptureModule: RCTEventEmitter {

    private var audioEngine: AVAudioEngine?
    private var audioTap: AVPlayerItemAudioTapProcessor?

    @objc func attachToPlayer(_ playerId: String,
                               resolver resolve: @escaping RCTPromiseResolveBlock,
                               rejecter reject: @escaping RCTPromiseRejectBlock) {
        // Implementation: Attach MTAudioProcessingTap to AVPlayerItem
        // Convert audio to 48kHz PCM mono
        // Emit chunks via sendEvent(withName: "onAudioChunkCaptured")
    }

    override func supportedEvents() -> [String]! {
        return ["onAudioChunkCaptured"]
    }
}
```

**Bridge Header**:
```objc
// ios-app/BayitPlus/Dubbing/HLSAudioCaptureModule.m
@interface RCT_EXTERN_MODULE(HLSAudioCaptureModule, RCTEventEmitter)

RCT_EXTERN_METHOD(attachToPlayer:(NSString *)playerId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
```

**React Native Integration**:
```typescript
// shared/services/dubbing/HLSAudioCapture.native.ts
import { NativeModules, NativeEventEmitter } from 'react-native';

const { HLSAudioCaptureModule } = NativeModules;
const eventEmitter = new NativeEventEmitter(HLSAudioCaptureModule);

export class HLSAudioCapture {
    attachToPlayer(playerId: string): Promise<void> {
        return HLSAudioCaptureModule.attachToPlayer(playerId);
    }

    onAudioChunk(callback: (chunk: AudioChunk) => void) {
        return eventEmitter.addListener('onAudioChunkCaptured', callback);
    }
}
```
```

---

## 13. iOS Implementation Checklist

### 13.1 Phase 1: Audio Architecture Resolution

- [ ] **DECISION**: Choose Base64 MP3 OR Raw PCM format
- [ ] Update backend WebSocket message format if needed
- [ ] Update iOS native module API to match decision
- [ ] Update React Native TypeScript types
- [ ] Document audio format conversion pipeline

### 13.2 Phase 2: HLS Audio Capture Implementation

- [ ] Implement `HLSAudioCaptureModule.swift`
- [ ] Implement `MTAudioProcessingTap` for AVPlayer audio tap
- [ ] Implement audio format conversion (HLS codec → 48kHz PCM mono)
- [ ] Implement buffering strategy for real-time transmission
- [ ] Add error handling for audio tap failures
- [ ] Test audio capture with various HLS codecs (AAC, MP3, AC3)

### 13.3 Phase 3: Native Module Updates

- [ ] Reconcile existing `LiveDubbingAudioModule` with plan specification
- [ ] Add `initialize()` method if explicit initialization needed
- [ ] Update volume control API (`setMixVolumes` vs separate methods)
- [ ] Add event emitters (`onDubbingError`, `onDubbingStateChange`)
- [ ] Update Objective-C bridge header
- [ ] Update React Native TypeScript bindings

### 13.4 Phase 4: Audio Session Configuration

- [ ] Remove `.mixWithOthers` from iOS audio session options
- [ ] Set preferred sample rate to 48000 Hz
- [ ] Test audio interruption handling (phone calls)
- [ ] Test audio route change handling (Bluetooth, headphones)
- [ ] Test background audio continuation (if supported)

### 13.5 Phase 5: Accessibility Implementation

- [ ] Add `accessibilityLabel` to all dubbing controls
- [ ] Add `accessibilityRole` and `accessibilityState` where appropriate
- [ ] Implement Dynamic Type scaling for dubbing UI
- [ ] Test with VoiceOver enabled (logical focus order)
- [ ] Test with Reduce Motion enabled (disable animations)
- [ ] Test with Bold Text enabled (adjust typography)

### 13.6 Phase 6: iOS Testing

- [ ] Write XCTest unit tests for native modules
- [ ] Write XCTest UI tests for dubbing controls
- [ ] Implement screenshot automation (all device sizes)
- [ ] Test on iOS Simulator (functional tests only)
- [ ] Test on physical devices (audio interruptions, route changes)
- [ ] Run memory profiler (Instruments) for 1-hour session
- [ ] TestFlight beta distribution to external testers

### 13.7 Phase 7: Performance Optimization

- [ ] Measure audio latency on physical devices
- [ ] Adjust `sync_delay_ms` based on iOS measurements (recommend 1500ms)
- [ ] Optimize audio buffer sizes for real-time performance
- [ ] Profile memory usage and optimize buffer cleanup
- [ ] Test with low network bandwidth (throttled connection)

### 13.8 Phase 8: Documentation

- [ ] Update iOS developer documentation with dubbing architecture
- [ ] Document audio capture pipeline (HLS → PCM → WebSocket)
- [ ] Document native module APIs and TypeScript bindings
- [ ] Create iOS-specific troubleshooting guide
- [ ] Add code comments for complex audio processing logic

---

## 14. Final Recommendation

### Status: ⚠️ **CHANGES REQUIRED**

**The plan CANNOT be approved for iOS implementation until the following are resolved**:

### Critical Blockers

1. **Audio Input Source Clarification**: Plan MUST specify HLS stream audio capture, NOT microphone
2. **Audio Format Decision**: Choose Base64 MP3 OR Raw PCM and update ALL sections consistently
3. **HLS Audio Capture Module**: Plan MUST add specification for capturing audio from AVPlayer
4. **iOS Testing Matrix**: Plan MUST add comprehensive iOS device/version/accessibility test matrix
5. **Native Module API Reconciliation**: Plan MUST reconcile existing API with proposed API OR provide migration path

### High-Priority Changes

6. **Audio Session Configuration**: Remove `.mixWithOthers` from iOS config
7. **Accessibility Implementation**: Add full iOS accessibility features (VoiceOver, Dynamic Type, Reduce Motion)
8. **Latency Budget Adjustment**: Increase `sync_delay_ms` to 1500ms for iOS
9. **Physical Device Testing**: Require physical device testing for audio features
10. **Screenshot Automation**: Add iOS screenshot capture automation

### Once These Are Resolved

After implementing the required changes, the plan will be **READY FOR iOS IMPLEMENTATION**.

**Estimated iOS Implementation Effort**:
- Phase 1-2 (Audio Architecture + HLS Capture): **3-4 weeks**
- Phase 3-4 (Native Module + Audio Session): **2-3 weeks**
- Phase 5-6 (Accessibility + Testing): **2-3 weeks**
- Phase 7-8 (Performance + Documentation): **1-2 weeks**

**Total Estimated iOS Development Time**: **8-12 weeks**

---

## Approval Signature

**Reviewer**: iOS Developer Agent
**Date**: 2026-01-23
**Status**: ⚠️ **CHANGES REQUIRED** - See Critical Blockers section
**Next Review**: After plan updates addressing all critical blockers

---

## Appendix A: iOS Dubbing Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    iOS LIVE DUBBING ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                   REACT NATIVE LAYER                            │ │
│  │                                                                  │ │
│  │  ┌──────────────────┐         ┌──────────────────┐            │ │
│  │  │ Video Player     │         │ Dubbing Controls │            │ │
│  │  │ (react-native-   │         │ (Glass UI)       │            │ │
│  │  │  video + HLS)    │         └──────────────────┘            │ │
│  │  └────────┬─────────┘                                          │ │
│  │           │ AVPlayer ID                                        │ │
│  └───────────┼────────────────────────────────────────────────────┘ │
│              │                                                       │
│              ▼                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                  NATIVE SWIFT MODULES                           │ │
│  │                                                                  │ │
│  │  ┌───────────────────────────────────────────────────────────┐ │ │
│  │  │  HLSAudioCaptureModule                                     │ │ │
│  │  │  ┌────────────────────────────────────────────────────┐   │ │ │
│  │  │  │ MTAudioProcessingTap (attached to AVPlayerItem)     │   │ │ │
│  │  │  │   • Capture audio from HLS stream                   │   │ │ │
│  │  │  │   • Convert to 48kHz PCM mono                       │   │ │ │
│  │  │  │   • Buffer and emit chunks (50-100ms)               │   │ │ │
│  │  │  └────────────────────────────────────────────────────┘   │ │ │
│  │  └───────────────────────────────────────────────────────────┘ │ │
│  │                           │                                      │ │
│  │                           │ PCM chunks (Base64)                  │ │
│  │                           ▼                                      │ │
│  │  ┌───────────────────────────────────────────────────────────┐ │ │
│  │  │  WebSocketConnection (URLSessionWebSocketTask)            │ │ │
│  │  │   • Send PCM audio to backend                             │ │ │
│  │  │   • Receive dubbed audio (Base64 MP3 OR raw PCM)          │ │ │
│  │  └───────────────────────────────────────────────────────────┘ │ │
│  │                           │                                      │ │
│  │                           │ Dubbed audio                         │ │
│  │                           ▼                                      │ │
│  │  ┌───────────────────────────────────────────────────────────┐ │ │
│  │  │  LiveDubbingAudioModule                                    │ │ │
│  │  │  ┌────────────────────────────────────────────────────┐   │ │ │
│  │  │  │ AVAudioEngine + AVAudioPlayerNode                   │   │ │ │
│  │  │  │   • Decode Base64 MP3 → PCM (if MP3)                │   │ │ │
│  │  │  │   • Schedule PCM buffers for playback               │   │ │ │
│  │  │  │   • Sync delay: 1500ms (configurable)               │   │ │ │
│  │  │  │   • Volume control for dubbed audio                 │   │ │ │
│  │  │  └────────────────────────────────────────────────────┘   │ │ │
│  │  └───────────────────────────────────────────────────────────┘ │ │
│  │                           │                                      │ │
│  │                           ▼                                      │ │
│  │  ┌───────────────────────────────────────────────────────────┐ │ │
│  │  │  AVAudioSession (configured for live dubbing)             │ │ │
│  │  │   • Category: .playback                                   │ │ │
│  │  │   • Mode: .moviePlayback                                  │ │ │
│  │  │   • Options: .allowAirPlay, .allowBluetooth, .duckOthers  │ │ │
│  │  │   • Preferred Sample Rate: 48000 Hz                       │ │ │
│  │  └───────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    AUDIO OUTPUT                                 │ │
│  │   • Device speakers                                             │ │
│  │   • Bluetooth headphones (AirPods)                              │ │
│  │   • AirPlay (Apple TV, HomePod)                                 │ │
│  │   • Wired headphones (Lightning/USB-C)                          │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

AUDIO FLOW:
1. HLS stream plays in react-native-video (AVPlayer)
2. MTAudioProcessingTap captures audio from AVPlayerItem
3. Audio converted to 48kHz PCM mono and sent via WebSocket
4. Backend performs STT → Translation → TTS
5. Dubbed audio received via WebSocket
6. LiveDubbingAudioModule plays dubbed audio with 1500ms sync delay
7. Original video audio + dubbed audio mixed in AVAudioSession
8. User controls volume balance via dubbing controls
```

---

**End of iOS Developer Review**
