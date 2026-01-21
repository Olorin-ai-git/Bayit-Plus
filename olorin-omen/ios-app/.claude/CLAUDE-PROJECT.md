# Omen Project Configuration

**Project Type:** iOS Real-Time Speech Translation Application
**Version:** 1.0.0
**Last Updated:** 2026-01-15

---

## Project Context

**Omen** is a real-time speech transcription, translation, and text-to-speech iOS application with ESP32 wearable display integration. Built exclusively with native iOS technologies for iPhone 15 Pro/Max and iPhone 16 Pro/Max.

### Tech Stack

**iOS Platform:**
- **Swift 5.9+** - Modern Swift with async/await
- **SwiftUI** - Declarative UI framework
- **Combine** - Reactive programming for state management
- **AVFoundation** - Audio capture and playback
- **CoreBluetooth** - BLE communication with ESP32
- **App Intents** - Action Button integration (iPhone 15/16 Pro)

**External APIs:**
- **OpenAI Realtime API** - WebSocket-based speech transcription and translation
- **ElevenLabs API** - High-quality text-to-speech synthesis

**Build & Configuration:**
- Xcode 15.0+
- iOS 17.0+ deployment target
- Config.xcconfig for API keys
- Swift Package Manager for dependencies (if needed)

### Languages Supported
- **Input:** English (optimized)
- **Output:** Spanish, French, German, Japanese, Mandarin Chinese

---

## Project-Specific Rules

### 1. iOS Development Standards

**MANDATORY: 100% Native SwiftUI**
- All UI built with native SwiftUI components
- NO third-party UI libraries or frameworks
- NO React Native, Flutter, or cross-platform frameworks
- Use native iOS design patterns (MVVM, Combine publishers)

**Forbidden:**
- UIKit components (except when required for unavailable SwiftUI APIs)
- Third-party UI libraries
- Objective-C code (Swift only)
- Custom CSS or web-based views

**Example:**
```swift
import SwiftUI

struct ContentCard: View {
    let title: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
                .foregroundColor(.white)
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(16)
    }
}
```

### 2. Configuration Management

**MANDATORY: Config.xcconfig Only**
- All API keys in `Config.xcconfig` (gitignored)
- NEVER hardcode API keys in Swift code
- Environment-specific configs supported
- Reference via `$(API_KEY_NAME)` in Info.plist

**API Keys:**
```
// Config.xcconfig
OPENAI_API_KEY = sk-proj-...
ELEVENLABS_API_KEY = ...
```

**Info.plist Reference:**
```xml
<key>OpenAIAPIKey</key>
<string>$(OPENAI_API_KEY)</string>
```

**Swift Access:**
```swift
let apiKey = Bundle.main.infoDictionary?["OpenAIAPIKey"] as? String
```

### 3. Audio Processing

**Real-Time Audio Requirements:**
- **16kHz Sample Rate** - Required for OpenAI Realtime API
- **Mono Channel** - Single channel audio
- **PCM Format** - 16-bit linear PCM
- **256ms Chunks** - Low-latency streaming
- **Background Audio** - Continue processing when app backgrounded

**Audio Session Configuration:**
```swift
let audioSession = AVAudioSession.sharedInstance()
try audioSession.setCategory(.playAndRecord, mode: .voiceChat)
try audioSession.setActive(true)
```

### 4. Bluetooth (BLE) Integration

**ESP32 Wearable Communication:**
- **Service UUID:** `6E400001-B5A3-F393-E0A9-E50E24DCCA9E`
- **TX Characteristic:** `6E400002-B5A3-F393-E0A9-E50E24DCCA9E`
- **Device Name:** `Omen_ESP32`
- **Debounced Writes** - 100ms debounce to prevent buffer overflow
- **UTF-8 Encoding** - Text sent as UTF-8 bytes

**Critical:**
- Always use weak self in BLE callbacks to prevent retain cycles
- Implement proper state management for connection lifecycle
- Handle disconnections gracefully with auto-reconnect

### 5. Async/Await and Concurrency

**Modern Swift Concurrency:**
- Use `async/await` for all asynchronous operations
- Use `@MainActor` for UI updates
- Use `Task` for concurrent work
- Avoid callbacks and completion handlers (use async patterns)

**Example:**
```swift
@MainActor
func updateUI(with text: String) {
    self.currentText = text
}

func fetchData() async throws -> Data {
    let (data, _) = try await URLSession.shared.data(from: url)
    return data
}
```

### 6. State Management with Combine

**Publisher-Subscriber Pattern:**
- Use `@Published` properties for observable state
- Use `sink` for subscribing to publishers
- Use `debounce` for rate-limiting updates
- Use `removeDuplicates` to prevent redundant updates

**Example:**
```swift
class OmenViewModel: ObservableObject {
    @Published var originalText: String = ""
    @Published var translatedText: String = ""

    private var cancellables = Set<AnyCancellable>()

    init() {
        $translatedText
            .debounce(for: .milliseconds(100), scheduler: DispatchQueue.main)
            .sink { [weak self] text in
                self?.sendToBluetooth(text)
            }
            .store(in: &cancellables)
    }
}
```

---

## Active Features

### 1. Real-Time Transcription
- Captures audio via AVAudioEngine
- Streams to OpenAI Realtime API via WebSocket
- Receives transcription in real-time
- Displays in "Original" text view

### 2. Live Translation
- Receives translations from OpenAI Realtime API
- Supports 5 target languages
- Updates in real-time as user speaks
- Displays in "Translation" text view

### 3. Text-to-Speech
- Synthesizes translated text via ElevenLabs API
- 4 voice options (Rachel, Adam, Bella, Arnold)
- Streaming audio playback
- Toggle on/off in settings

### 4. ESP32 Wearable Display
- Scans for BLE devices named `Omen_ESP32`
- Connects via CoreBluetooth
- Streams translated text with 100ms debounce
- Auto-reconnect on disconnect

### 5. Action Button Integration
- iPhone 15/16 Pro exclusive feature
- Triggers session start via App Intents
- Quick access without opening app
- Background session support

### 6. Audio Visualization
- Real-time waveform display
- Shows voice input amplitude
- Visual feedback during speech
- Smooth animations with SwiftUI

---

## Critical Files

### Models
- `Omen/Models/BLEConstants.swift` - Bluetooth UUID definitions
- `Omen/Models/TranslationSettings.swift` - User preferences model
- `Omen/Models/AudioSample.swift` - Audio data structures

### Services
- `Omen/Services/AudioEngine.swift` - 16kHz audio capture and streaming
- `Omen/Services/OpenAIService.swift` - WebSocket client for OpenAI Realtime API
- `Omen/Services/ElevenLabsService.swift` - TTS synthesis and streaming
- `Omen/Services/BluetoothManager.swift` - BLE manager for ESP32 communication

### ViewModels
- `Omen/ViewModels/OmenViewModel.swift` - Main MVVM coordinator (Combine publishers)

### Views
- `Omen/Views/ContentView.swift` - Main app view
- `Omen/Views/DualTextView.swift` - Original + Translation display
- `Omen/Views/SettingsView.swift` - Settings screen
- `Omen/Views/WaveformVisualizer.swift` - Audio waveform visualization

### Intents
- `Omen/Intents/StartSessionIntent.swift` - Action Button app intent

### App Entry
- `Omen/OmenApp.swift` - SwiftUI app lifecycle

### Configuration
- `Config.xcconfig` - API keys (gitignored)
- `Info.plist` - App permissions and configuration

---

## Development Workflows

### Building the App

```bash
# Open in Xcode
open Omen.xcodeproj

# Build (⌘+B)
# Run on device (⌘+R)
```

### Running Tests

```bash
# Unit tests (⌘+U in Xcode)
# XCTest framework for Swift testing
```

### Code Quality

```bash
# SwiftLint (if added)
swiftlint lint

# SwiftFormat (if added)
swiftformat .
```

---

## Configuration Requirements

### Info.plist Permissions

**Required Permissions:**
```xml
<key>NSMicrophoneUsageDescription</key>
<string>Omen needs microphone access for real-time speech transcription</string>

<key>NSBluetoothAlwaysUsageDescription</key>
<string>Omen connects to your wearable display via Bluetooth</string>

<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
    <string>bluetooth-central</string>
</array>
```

### Capabilities

**Required Xcode Capabilities:**
- ✅ Background Modes (Audio, Bluetooth LE)
- ✅ App Intents (Action Button support)

### API Keys Setup

1. Create `Config.xcconfig` in project root
2. Add to `.gitignore`
3. Define keys:
```
OPENAI_API_KEY = sk-proj-your-key-here
ELEVENLABS_API_KEY = your-key-here
```
4. Reference in Info.plist
5. Access via Bundle.main

---

## Common Pitfalls

### ❌ Don't:
- Hardcode API keys in Swift code
- Use UIKit when SwiftUI equivalent exists
- Block main thread with synchronous operations
- Create strong reference cycles in async closures
- Use callbacks when async/await is available
- Ignore BLE disconnection events
- Skip weak self in Combine sinks
- Create mocks/stubs in production code
- Use third-party UI frameworks
- Ignore memory warnings

### ✅ Do:
- Store API keys in Config.xcconfig
- Use native SwiftUI components
- Use async/await for all async operations
- Use [weak self] in closures
- Use @MainActor for UI updates
- Handle BLE connection lifecycle
- Debounce high-frequency updates
- Use Combine for reactive state
- Test on real iPhone hardware
- Monitor memory usage with Instruments

---

## Testing Requirements

### Unit Tests
- Test ViewModel logic
- Test audio processing utilities
- Test BLE state machine
- Mock external API services
- Minimum 80% code coverage

### Integration Tests
- Test WebSocket connectivity
- Test audio pipeline end-to-end
- Test BLE communication
- Test TTS playback

### Device Testing
- **Required:** iPhone 15 Pro or 16 Pro for Action Button
- Test with real ESP32 hardware
- Test background audio continuation
- Test low battery scenarios
- Test poor network conditions

---

## Deployment

### TestFlight (Beta Testing)
```bash
# Archive build (Product → Archive in Xcode)
# Upload to App Store Connect
# Create TestFlight build
# Invite beta testers
```

### App Store Release
```bash
# Update version in Xcode project
# Create App Store screenshots
# Write release notes
# Submit for review
```

### Required Assets
- App Icon (1024x1024)
- Screenshots (iPhone 15 Pro Max, iPhone 16 Pro)
- Privacy policy URL
- App description and keywords

---

## API Integration Details

### OpenAI Realtime API

**WebSocket Connection:**
```swift
let url = URL(string: "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01")!
var request = URLRequest(url: url)
request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
request.setValue("realtime=v1", forHTTPHeaderField: "OpenAI-Beta")
```

**Audio Streaming:**
- Send PCM16 audio in 256ms chunks
- Receive transcription events
- Receive translation events
- Handle session lifecycle

### ElevenLabs API

**Text-to-Speech:**
```swift
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream
Headers:
  xi-api-key: {api_key}
Body:
  {
    "text": "translation text",
    "model_id": "eleven_multilingual_v2"
  }
```

**Voice IDs:**
- Rachel: `21m00Tcm4TlvDq8ikWAM`
- Adam: `pNInz6obpgDQGcFmaJgB`
- Bella: `EXAVITQu4vr4xnSDxMaL`
- Arnold: `VR6AewLTigWG4xSOukaG`

---

## Architecture Patterns

### MVVM (Model-View-ViewModel)

```
┌─────────────┐
│    Views    │ ← SwiftUI views, display only
└─────────────┘
       ↓
┌─────────────┐
│  ViewModel  │ ← @Published state, business logic
└─────────────┘
       ↓
┌─────────────┐
│  Services   │ ← Audio, OpenAI, ElevenLabs, BLE
└─────────────┘
       ↓
┌─────────────┐
│   Models    │ ← Data structures
└─────────────┘
```

### Service Layer Pattern

Each service is independent and injectable:
- `AudioEngine` - Audio capture
- `OpenAIService` - WebSocket client
- `ElevenLabsService` - TTS client
- `BluetoothManager` - BLE manager

ViewModel coordinates all services via Combine.

---

## Performance Optimization

### Audio Pipeline
- **256ms chunks** - Balance latency vs. overhead
- **16kHz sample rate** - Minimum for quality transcription
- **Ring buffer** - Prevent audio dropouts
- **Background audio** - Continue when app backgrounded

### Bluetooth
- **100ms debounce** - Prevent buffer overflow on ESP32
- **UTF-8 encoding** - Efficient text transmission
- **Auto-reconnect** - Handle temporary disconnections
- **Connection pooling** - Maintain single connection

### Memory Management
- **Weak references** - Prevent retain cycles
- **Cancellables cleanup** - Release Combine subscriptions
- **Audio buffer limits** - Cap buffer size
- **Image caching** - None needed (no images)

---

## Known Limitations

- **iOS 17.0+** required for Action Button API
- **Pro models only** for Action Button hardware
- **Internet required** - Both APIs need network
- **Single wearable** - One ESP32 connection at a time
- **English input optimized** - Best results with clear English
- **Battery intensive** - Real-time processing drains battery
- **API costs** - OpenAI + ElevenLabs usage charges apply

---

## Future Enhancements

- [ ] Live Activity for Dynamic Island
- [ ] Session history and playback
- [ ] Multiple ESP32 device support
- [ ] Offline transcription (on-device Speech framework)
- [ ] Custom wake word detection
- [ ] WidgetKit integration
- [ ] iCloud sync of settings
- [ ] watchOS companion app
- [ ] CarPlay integration
- [ ] Siri Shortcuts support

---

## Version History

- **1.0.0** (2026-01-15) - Initial project configuration
  - Defined iOS tech stack and architecture
  - Established native SwiftUI standards
  - Documented audio and BLE requirements
  - Created iOS-specific agent definitions

---

**Status:** ✅ Active Development
**Maintainer:** Omen Development Team
**Platform:** iOS 17.0+ (iPhone 15/16 Pro)
