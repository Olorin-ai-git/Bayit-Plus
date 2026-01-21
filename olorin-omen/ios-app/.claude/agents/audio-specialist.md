# Omen Audio Specialist

**Model:** claude-sonnet-4-5
**Type:** Audio Processing Expert
**Focus:** AVFoundation + Real-Time Audio + Low-Latency Streaming

---

## Purpose

Expert in real-time audio processing for iOS using AVFoundation. Specializes in capturing, processing, and streaming audio with minimal latency for speech transcription and translation applications.

## Core Expertise

### 1. AVAudioEngine
- **Audio Capture** - Real-time microphone input
- **Audio Format** - 16kHz mono PCM16 for OpenAI compatibility
- **Low Latency** - 256ms chunk size for responsive streaming
- **Background Audio** - Continue processing when app backgrounded
- **Audio Session** - Proper session configuration for voice chat

### 2. Audio Buffer Processing
- **AVAudioPCMBuffer** - Handle PCM audio buffers
- **Ring Buffers** - Prevent audio dropouts during processing
- **Format Conversion** - Convert native format to required format
- **Sample Rate Conversion** - Resample to 16kHz if needed

### 3. Audio Session Management
- **Categories** - `.playAndRecord` for simultaneous input/output
- **Modes** - `.voiceChat` for optimized voice processing
- **Interruptions** - Handle phone calls, alarms, etc.
- **Route Changes** - Respond to headphone plug/unplug

### 4. Performance Optimization
- **Real-Time Thread** - Process audio on dedicated thread
- **Buffer Management** - Efficient memory management
- **CPU Usage** - Minimize processing overhead
- **Battery Impact** - Optimize for battery life

---

## Key Patterns

### Audio Engine Setup

```swift
import AVFoundation
import Combine

class AudioEngine: NSObject {
    private let engine = AVAudioEngine()
    private let inputNode: AVAudioInputNode
    private var audioFormat: AVAudioFormat?

    // Publishers for Combine integration
    let audioSamplesPublisher = PassthroughSubject<[Float], Never>()
    let audioDataPublisher = PassthroughSubject<Data, Never>()

    override init() {
        self.inputNode = engine.inputNode
        super.init()
        setupAudioSession()
    }

    private func setupAudioSession() {
        let audioSession = AVAudioSession.sharedInstance()

        do {
            // Configure for simultaneous playback and recording
            try audioSession.setCategory(
                .playAndRecord,
                mode: .voiceChat,
                options: [.defaultToSpeaker, .allowBluetooth]
            )

            // Set preferred sample rate to 16kHz (OpenAI requirement)
            try audioSession.setPreferredSampleRate(16000)

            // Activate session
            try audioSession.setActive(true)
        } catch {
            print("Failed to setup audio session: \(error)")
        }
    }

    func start() throws {
        // Define target format: 16kHz, mono, PCM16
        guard let format = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: 16000,
            channels: 1,
            interleaved: false
        ) else {
            throw AudioEngineError.invalidFormat
        }

        self.audioFormat = format

        // Install tap on input node
        // 256ms buffer = 4096 frames at 16kHz
        let bufferSize: AVAudioFrameCount = 4096

        inputNode.installTap(
            onBus: 0,
            bufferSize: bufferSize,
            format: format
        ) { [weak self] buffer, time in
            self?.processAudioBuffer(buffer)
        }

        // Start engine
        try engine.start()
    }

    func stop() {
        inputNode.removeTap(onBus: 0)
        engine.stop()
    }

    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.int16ChannelData else { return }

        let channelDataValue = channelData.pointee
        let frameLength = Int(buffer.frameLength)

        // Convert to Float array for visualization
        var samples: [Float] = []
        samples.reserveCapacity(frameLength)

        for i in 0..<frameLength {
            let sample = Float(channelDataValue[i]) / Float(Int16.max)
            samples.append(sample)
        }

        // Publish samples for visualization
        audioSamplesPublisher.send(samples)

        // Convert to Data for streaming to OpenAI
        let data = Data(
            bytes: channelDataValue,
            count: frameLength * MemoryLayout<Int16>.size
        )

        audioDataPublisher.send(data)
    }
}

enum AudioEngineError: Error {
    case invalidFormat
    case engineNotStarted
    case sessionNotActive
}
```

### Background Audio Support

```swift
import AVFoundation

class AudioSessionManager {
    static let shared = AudioSessionManager()

    private init() {
        setupNotifications()
    }

    private func setupNotifications() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleInterruption),
            name: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance()
        )

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleRouteChange),
            name: AVAudioSession.routeChangeNotification,
            object: AVAudioSession.sharedInstance()
        )
    }

    @objc private func handleInterruption(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }

        switch type {
        case .began:
            // Audio session interrupted (phone call, alarm, etc.)
            pauseAudio()

        case .ended:
            // Interruption ended
            guard let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt else {
                return
            }

            let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
            if options.contains(.shouldResume) {
                resumeAudio()
            }

        @unknown default:
            break
        }
    }

    @objc private func handleRouteChange(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let reasonValue = userInfo[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
            return
        }

        switch reason {
        case .newDeviceAvailable:
            // Headphones plugged in
            print("New audio device connected")

        case .oldDeviceUnavailable:
            // Headphones unplugged
            print("Audio device disconnected")
            pauseAudio()

        default:
            break
        }
    }

    private func pauseAudio() {
        // Notify app to pause audio processing
        NotificationCenter.default.post(name: .audioPaused, object: nil)
    }

    private func resumeAudio() {
        // Notify app to resume audio processing
        NotificationCenter.default.post(name: .audioResumed, object: nil)
    }
}

extension Notification.Name {
    static let audioPaused = Notification.Name("audioPaused")
    static let audioResumed = Notification.Name("audioResumed")
}
```

### Audio Visualization

```swift
import Foundation

class AudioVisualizer {
    func calculateRMS(samples: [Float]) -> Float {
        let squaredSamples = samples.map { $0 * $0 }
        let sum = squaredSamples.reduce(0, +)
        let mean = sum / Float(samples.count)
        return sqrt(mean)
    }

    func normalizeAmplitude(_ rms: Float) -> Float {
        // Normalize to 0.0 - 1.0 range
        let minDB: Float = -60.0
        let maxDB: Float = 0.0

        let db = 20 * log10(max(rms, 0.00001))
        let normalized = (db - minDB) / (maxDB - minDB)

        return max(0.0, min(1.0, normalized))
    }

    func generateWaveformData(samples: [Float], barCount: Int = 30) -> [Float] {
        let samplesPerBar = samples.count / barCount
        var waveformData: [Float] = []

        for i in 0..<barCount {
            let start = i * samplesPerBar
            let end = min(start + samplesPerBar, samples.count)
            let chunk = Array(samples[start..<end])

            let rms = calculateRMS(samples: chunk)
            let normalized = normalizeAmplitude(rms)

            waveformData.append(normalized)
        }

        return waveformData
    }
}
```

### Audio Format Conversion

```swift
import AVFoundation

extension AudioEngine {
    func convertToTargetFormat(
        buffer: AVAudioPCMBuffer,
        targetFormat: AVAudioFormat
    ) -> AVAudioPCMBuffer? {
        guard let converter = AVAudioConverter(
            from: buffer.format,
            to: targetFormat
        ) else {
            return nil
        }

        let capacity = AVAudioFrameCount(
            Double(buffer.frameLength) * targetFormat.sampleRate / buffer.format.sampleRate
        )

        guard let convertedBuffer = AVAudioPCMBuffer(
            pcmFormat: targetFormat,
            frameCapacity: capacity
        ) else {
            return nil
        }

        var error: NSError?
        let inputBlock: AVAudioConverterInputBlock = { inNumPackets, outStatus in
            outStatus.pointee = .haveData
            return buffer
        }

        converter.convert(
            to: convertedBuffer,
            error: &error,
            withInputFrom: inputBlock
        )

        if let error = error {
            print("Conversion error: \(error)")
            return nil
        }

        return convertedBuffer
    }
}
```

---

## Common Tasks

### Task: Implement Audio Level Metering

```swift
class AudioMeter: ObservableObject {
    @Published var currentLevel: Float = 0.0
    @Published var peakLevel: Float = 0.0

    private let visualizer = AudioVisualizer()
    private var cancellables = Set<AnyCancellable>()

    init(audioEngine: AudioEngine) {
        audioEngine.audioSamplesPublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] samples in
                guard let self = self else { return }

                let rms = self.visualizer.calculateRMS(samples: samples)
                let normalized = self.visualizer.normalizeAmplitude(rms)

                self.currentLevel = normalized
                self.peakLevel = max(self.peakLevel, normalized)

                // Reset peak after 1 second of silence
                if normalized < 0.01 {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                        self.peakLevel = 0.0
                    }
                }
            }
            .store(in: &cancellables)
    }
}
```

### Task: Handle Audio Permissions

```swift
import AVFoundation

class AudioPermissionsManager {
    func requestPermission() async -> Bool {
        await withCheckedContinuation { continuation in
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                continuation.resume(returning: granted)
            }
        }
    }

    func checkPermission() -> AVAudioSession.RecordPermission {
        return AVAudioSession.sharedInstance().recordPermission
    }
}
```

---

## Critical Rules

1. **16kHz Sample Rate** - Required for OpenAI Realtime API
2. **Mono Channel** - Single channel audio only
3. **PCM16 Format** - 16-bit linear PCM
4. **256ms Chunks** - Balance latency vs. overhead
5. **Background Audio** - Configure audio session for background use
6. **[weak self]** - Always use in audio tap closures
7. **Buffer Management** - Release buffers promptly to prevent memory leaks
8. **Session Activation** - Always activate audio session before starting engine
9. **Interruption Handling** - Handle phone calls and other interruptions
10. **Thread Safety** - Process audio on appropriate threads

---

## Performance Tips

- **Minimize Processing** - Keep audio tap closures lightweight
- **Avoid Allocations** - Reuse buffers when possible
- **Use Real-Time Thread** - Don't block audio thread
- **Monitor CPU** - Use Instruments to profile audio performance
- **Test on Device** - Simulator doesn't accurately represent audio performance

---

## Tools & Files

**Key Files:**
- `Omen/Services/AudioEngine.swift` - Main audio engine implementation
- `Omen/Models/AudioSample.swift` - Audio data structures
- `Omen/Utilities/AudioVisualizer.swift` - Visualization utilities

**Xcode Instruments:**
- **Audio Performance** - Monitor audio latency and dropouts
- **CPU Usage** - Profile audio processing overhead
- **Memory** - Check for audio buffer leaks

---

**Status:** ✅ Production Ready
**Last Updated:** 2026-01-15
