# Test Audio Command

Test the complete audio pipeline for Omen's real-time transcription system.

## Usage

```bash
/test-audio [--verbose] [--device]
```

## Description

Tests the entire audio processing pipeline including capture, format conversion, streaming to OpenAI, and playback through ElevenLabs. Verifies low-latency performance and proper audio quality.

## Arguments

- **--verbose** - Show detailed audio metrics and logs
- **--device** - Test on physical device (default: simulator)

## Examples

### Run Audio Tests
```bash
/test-audio
```

### Verbose Output
```bash
/test-audio --verbose
```

### Test on Device
```bash
/test-audio --device
```

## Test Components

### 1. Audio Capture Test

```swift
func testAudioCapture() async throws {
    let audioEngine = AudioEngine()

    // Start audio engine
    try audioEngine.start()

    // Verify audio is being captured
    let expectation = XCTestExpectation(description: "Audio samples received")

    audioEngine.audioSamplesPublisher
        .sink { samples in
            XCTAssertGreaterThan(samples.count, 0)
            expectation.fulfill()
        }
        .store(in: &cancellables)

    await fulfillment(of: [expectation], timeout: 2.0)

    // Stop engine
    audioEngine.stop()
}
```

### 2. Format Verification Test

```swift
func testAudioFormat() throws {
    let audioEngine = AudioEngine()

    // Verify format is 16kHz mono PCM16
    let format = audioEngine.audioFormat

    XCTAssertEqual(format?.sampleRate, 16000)
    XCTAssertEqual(format?.channelCount, 1)
    XCTAssertEqual(format?.commonFormat, .pcmFormatInt16)
}
```

### 3. Latency Test

```swift
func testAudioLatency() async throws {
    let audioEngine = AudioEngine()
    try audioEngine.start()

    let startTime = Date()
    var latencies: [TimeInterval] = []

    audioEngine.audioDataPublisher
        .prefix(10)
        .sink { _ in
            let latency = Date().timeIntervalSince(startTime)
            latencies.append(latency)
        }
        .store(in: &cancellables)

    // Wait for samples
    try await Task.sleep(nanoseconds: 3_000_000_000)

    audioEngine.stop()

    // Verify latency < 300ms
    let avgLatency = latencies.reduce(0, +) / Double(latencies.count)
    XCTAssertLessThan(avgLatency, 0.3)
}
```

### 4. Buffer Processing Test

```swift
func testBufferProcessing() throws {
    let audioEngine = AudioEngine()

    // Create test buffer
    let format = AVAudioFormat(
        commonFormat: .pcmFormatInt16,
        sampleRate: 16000,
        channels: 1,
        interleaved: false
    )!

    let buffer = AVAudioPCMBuffer(
        pcmFormat: format,
        frameCapacity: 4096
    )!
    buffer.frameLength = 4096

    // Process buffer
    var receivedData: Data?

    audioEngine.audioDataPublisher
        .sink { data in
            receivedData = data
        }
        .store(in: &cancellables)

    audioEngine.processAudioBuffer(buffer)

    // Verify data was generated
    XCTAssertNotNil(receivedData)
    XCTAssertEqual(receivedData?.count, 4096 * 2) // 2 bytes per sample
}
```

### 5. Audio Session Test

```swift
func testAudioSessionConfiguration() throws {
    let audioSession = AVAudioSession.sharedInstance()

    // Verify category
    XCTAssertEqual(
        audioSession.category,
        .playAndRecord
    )

    // Verify mode
    XCTAssertEqual(
        audioSession.mode,
        .voiceChat
    )

    // Verify sample rate
    XCTAssertEqual(
        audioSession.sampleRate,
        16000,
        accuracy: 100
    )
}
```

### 6. Visualization Test

```swift
func testWaveformGeneration() {
    let visualizer = AudioVisualizer()

    // Generate test samples
    let samples: [Float] = (0..<1000).map { _ in
        Float.random(in: -1.0...1.0)
    }

    // Generate waveform data
    let waveformData = visualizer.generateWaveformData(
        samples: samples,
        barCount: 30
    )

    // Verify waveform
    XCTAssertEqual(waveformData.count, 30)
    XCTAssertTrue(waveformData.allSatisfy { $0 >= 0.0 && $0 <= 1.0 })
}
```

### 7. Integration Test with OpenAI

```swift
func testAudioStreamingToOpenAI() async throws {
    // Note: This test requires valid API key
    let openAIService = OpenAIService(apiKey: AppConfig.openAIAPIKey)
    let audioEngine = AudioEngine()

    // Connect to OpenAI
    try await openAIService.connect()

    // Start audio capture
    try audioEngine.start()

    // Stream audio for 3 seconds
    let expectation = XCTestExpectation(description: "Audio streamed")

    audioEngine.audioDataPublisher
        .prefix(10)
        .sink { audioData in
            Task {
                try? await openAIService.sendAudioChunk(audioData)
            }
        }
        .store(in: &cancellables)

    try await Task.sleep(nanoseconds: 3_000_000_000)

    expectation.fulfill()

    await fulfillment(of: [expectation], timeout: 5.0)

    // Cleanup
    audioEngine.stop()
    openAIService.disconnect()
}
```

## Performance Benchmarks

### Expected Metrics

```
Audio Capture:
  Sample Rate: 16000 Hz ±100 Hz
  Channels: 1 (mono)
  Format: PCM16
  Buffer Size: 4096 frames (256ms at 16kHz)

Latency:
  Capture to Publisher: < 50ms
  Publisher to WebSocket: < 100ms
  End-to-End: < 300ms

CPU Usage:
  Idle: < 5%
  Active Capture: 10-15%
  Active Processing: 20-30%

Memory:
  Initial: ~10 MB
  Active: ~20 MB
  Peak: < 50 MB
```

## Test Scenarios

### Scenario 1: Normal Operation
```
1. Start audio engine
2. Capture 5 seconds of audio
3. Verify sample count
4. Verify format
5. Verify latency
6. Stop engine
```

### Scenario 2: Background Mode
```
1. Start audio engine
2. Background app (simulate home button press)
3. Verify audio continues
4. Foreground app
5. Verify audio still running
6. Stop engine
```

### Scenario 3: Interruption Handling
```
1. Start audio engine
2. Simulate phone call interruption
3. Verify audio paused
4. End interruption
5. Verify audio resumed
6. Stop engine
```

### Scenario 4: Headphone Connection
```
1. Start audio engine
2. Connect headphones (simulate)
3. Verify route change handled
4. Disconnect headphones
5. Verify route change handled
6. Stop engine
```

## Validation Criteria

### ✅ Pass Criteria
- Audio captured at 16kHz
- Mono channel verified
- PCM16 format confirmed
- Latency < 300ms
- No audio dropouts
- CPU usage < 30%
- Memory usage < 50 MB
- Background audio works
- Interruption handling works

### ❌ Fail Criteria
- Sample rate mismatch
- Format conversion errors
- Latency > 500ms
- Audio dropouts detected
- CPU usage > 50%
- Memory leaks
- Background audio fails
- Crashes on interruption

## Output

```
🎤 Testing Omen Audio Pipeline...

1. Audio Capture Test
   ✓ Audio engine started
   ✓ Samples captured: 4096 frames
   ✓ Sample rate: 16000 Hz
   ✓ Channel count: 1 (mono)
   ✓ Format: PCM16

2. Format Verification Test
   ✓ Sample rate: 16000 Hz (expected: 16000 Hz)
   ✓ Channels: 1 (expected: 1)
   ✓ Format: pcmFormatInt16 (expected: pcmFormatInt16)

3. Latency Test
   ✓ Captured 10 buffers
   ✓ Average latency: 245ms
   ✓ Peak latency: 287ms
   ✓ All latencies < 300ms ✓

4. Buffer Processing Test
   ✓ Buffer created: 4096 frames
   ✓ Data generated: 8192 bytes
   ✓ Size correct: 4096 frames * 2 bytes = 8192 bytes ✓

5. Audio Session Test
   ✓ Category: playAndRecord
   ✓ Mode: voiceChat
   ✓ Sample rate: 16000 Hz

6. Visualization Test
   ✓ Waveform data generated: 30 bars
   ✓ All values normalized: 0.0-1.0 ✓

7. OpenAI Integration Test
   ✓ Connected to OpenAI Realtime API
   ✓ Streamed 10 audio chunks
   ✓ No errors detected
   ✓ Disconnected successfully

📊 Performance Metrics:
   CPU Usage: 22% (avg), 28% (peak)
   Memory Usage: 18 MB (avg), 24 MB (peak)
   Audio Dropouts: 0
   Test Duration: 12.3s

✅ All audio tests passed (7/7)
   Audio pipeline is ready for production use.
```

## Device Testing

When testing on device:

```bash
# Connect iPhone
# Select device in Xcode
# Run tests (⌘+U)

# Or use command line:
xcodebuild test \
    -project Omen.xcodeproj \
    -scheme Omen \
    -destination 'platform=iOS,name=Your iPhone'
```

## Troubleshooting

### No Audio Captured
- Check microphone permission
- Verify audio session is active
- Check audio engine is started

### Wrong Sample Rate
- Verify audio session configuration
- Check preferred sample rate is set to 16000

### High Latency
- Reduce buffer size (but may cause dropouts)
- Check for CPU throttling
- Profile with Instruments

### Memory Leaks
- Check for retain cycles in closures
- Verify buffers are released
- Use Instruments Memory Profiler

## Prerequisites

- Physical iPhone (for accurate audio testing)
- Microphone permission granted
- Quiet environment (for accurate tests)
- Valid OpenAI API key (for integration test)

## Related Files

- `Omen/Services/AudioEngine.swift`
- `OmenTests/AudioEngineTests.swift`
- `Omen/Utilities/AudioVisualizer.swift`

## See Also

- `/build-omen` - Build and test entire app
- `/deploy-omen` - Deploy to TestFlight
