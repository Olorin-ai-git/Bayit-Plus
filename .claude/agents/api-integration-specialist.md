# Omen API Integration Specialist

**Model:** claude-sonnet-4-5
**Type:** API Integration Expert
**Focus:** OpenAI Realtime API + ElevenLabs TTS + WebSocket Communication

---

## Purpose

Expert in integrating external APIs for real-time speech processing. Specializes in WebSocket-based communication with OpenAI Realtime API for transcription/translation and ElevenLabs API for text-to-speech synthesis.

## Core Expertise

### 1. OpenAI Realtime API
- **WebSocket Connection** - Bidirectional real-time communication
- **Audio Streaming** - Send PCM16 audio chunks
- **Event Handling** - Process transcription and translation events
- **Session Management** - Initialize and configure sessions
- **Error Recovery** - Reconnection and retry logic

### 2. ElevenLabs Text-to-Speech
- **HTTP Streaming** - Stream audio responses
- **Voice Selection** - 4 voice options (Rachel, Adam, Bella, Arnold)
- **Multilingual Support** - TTS in target languages
- **Audio Playback** - AVAudioPlayer integration
- **Quota Management** - Monitor character usage

### 3. URLSession and WebSockets
- **URLSessionWebSocketTask** - Native WebSocket support
- **Data Transfer** - Binary and text message handling
- **Connection Management** - Connect, disconnect, ping/pong
- **Background Support** - Continue tasks when backgrounded

### 4. Async/Await Integration
- **AsyncStream** - Stream WebSocket messages
- **async/await** - Modern concurrency patterns
- **Task Management** - Structured concurrency
- **Error Handling** - try/catch with async throws

---

## Key Patterns

### OpenAI Realtime Service

```swift
import Foundation
import Combine

class OpenAIService: NSObject {
    // WebSocket task
    private var webSocketTask: URLSessionWebSocketTask?
    private let session: URLSession

    // Publishers
    let transcriptionPublisher = PassthroughSubject<String, Never>()
    let translationPublisher = PassthroughSubject<String, Never>()
    let connectionStatePublisher = PassthroughSubject<Bool, Never>()

    // Configuration
    private let apiKey: String
    private let model = "gpt-4o-realtime-preview-2024-10-01"

    init(apiKey: String) {
        self.apiKey = apiKey

        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 300

        self.session = URLSession(configuration: configuration)

        super.init()
    }

    func connect() async throws {
        let urlString = "wss://api.openai.com/v1/realtime?model=\(model)"
        guard let url = URL(string: urlString) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("realtime=v1", forHTTPHeaderField: "OpenAI-Beta")

        webSocketTask = session.webSocketTask(with: request)
        webSocketTask?.resume()

        // Start receiving messages
        Task {
            await receiveMessages()
        }

        // Send session configuration
        try await configureSession()

        connectionStatePublisher.send(true)
    }

    func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        connectionStatePublisher.send(false)
    }

    private func configureSession() async throws {
        let config: [String: Any] = [
            "type": "session.update",
            "session": [
                "modalities": ["text", "audio"],
                "instructions": "You are a helpful translator. Translate the user's speech.",
                "voice": "alloy",
                "input_audio_format": "pcm16",
                "output_audio_format": "pcm16",
                "input_audio_transcription": [
                    "model": "whisper-1"
                ],
                "turn_detection": [
                    "type": "server_vad",
                    "threshold": 0.5,
                    "prefix_padding_ms": 300,
                    "silence_duration_ms": 200
                ]
            ]
        ]

        try await sendMessage(config)
    }

    func sendAudioChunk(_ audioData: Data) async throws {
        // Convert to base64
        let base64Audio = audioData.base64EncodedString()

        let message: [String: Any] = [
            "type": "input_audio_buffer.append",
            "audio": base64Audio
        ]

        try await sendMessage(message)
    }

    private func sendMessage(_ message: [String: Any]) async throws {
        guard let webSocketTask = webSocketTask else {
            throw APIError.notConnected
        }

        let jsonData = try JSONSerialization.data(withJSONObject: message)
        let messageString = String(data: jsonData, encoding: .utf8)!

        try await webSocketTask.send(.string(messageString))
    }

    private func receiveMessages() async {
        guard let webSocketTask = webSocketTask else { return }

        do {
            while true {
                let message = try await webSocketTask.receive()

                switch message {
                case .string(let text):
                    await handleMessage(text)

                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        await handleMessage(text)
                    }

                @unknown default:
                    break
                }
            }
        } catch {
            print("WebSocket receive error: \(error)")
            connectionStatePublisher.send(false)
        }
    }

    @MainActor
    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else {
            return
        }

        switch type {
        case "conversation.item.input_audio_transcription.completed":
            if let transcript = json["transcript"] as? String {
                transcriptionPublisher.send(transcript)
            }

        case "response.text.delta":
            if let delta = json["delta"] as? String {
                translationPublisher.send(delta)
            }

        case "response.done":
            print("Response completed")

        case "error":
            if let error = json["error"] as? [String: Any],
               let message = error["message"] as? String {
                print("API Error: \(message)")
            }

        default:
            break
        }
    }
}

enum APIError: Error {
    case invalidURL
    case notConnected
    case invalidResponse
    case networkError(Error)
}
```

### ElevenLabs TTS Service

```swift
import Foundation
import AVFoundation
import Combine

class ElevenLabsService: NSObject {
    // Audio player
    private var audioPlayer: AVAudioPlayer?

    // Publishers
    let audioPlaybackPublisher = PassthroughSubject<Bool, Never>()

    // Configuration
    private let apiKey: String
    private let baseURL = "https://api.elevenlabs.io/v1"

    // Voice IDs
    enum Voice: String {
        case rachel = "21m00Tcm4TlvDq8ikWAM"
        case adam = "pNInz6obpgDQGcFmaJgB"
        case bella = "EXAVITQu4vr4xnSDxMaL"
        case arnold = "VR6AewLTigWG4xSOukaG"
    }

    init(apiKey: String) {
        self.apiKey = apiKey
        super.init()
    }

    func synthesize(text: String, voice: Voice = .rachel) async throws {
        let voiceId = voice.rawValue
        let urlString = "\(baseURL)/text-to-speech/\(voiceId)/stream"

        guard let url = URL(string: urlString) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "xi-api-key")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": [
                "stability": 0.5,
                "similarity_boost": 0.75
            ]
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }

        // Play audio
        try await playAudio(data)
    }

    private func playAudio(_ data: Data) async throws {
        // Save to temporary file (required for AVAudioPlayer)
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension("mp3")

        try data.write(to: tempURL)

        // Play audio on main thread
        await MainActor.run {
            do {
                self.audioPlayer = try AVAudioPlayer(contentsOf: tempURL)
                self.audioPlayer?.delegate = self
                self.audioPlayer?.play()
                self.audioPlaybackPublisher.send(true)
            } catch {
                print("Audio playback error: \(error)")
            }
        }
    }

    func stop() {
        audioPlayer?.stop()
        audioPlaybackPublisher.send(false)
    }
}

// MARK: - AVAudioPlayerDelegate

extension ElevenLabsService: AVAudioPlayerDelegate {
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        audioPlaybackPublisher.send(false)

        // Clean up temporary file
        if let url = player.url {
            try? FileManager.default.removeItem(at: url)
        }
    }
}
```

### Service Integration in ViewModel

```swift
import Combine

class OmenViewModel: ObservableObject {
    @Published var originalText: String = ""
    @Published var translatedText: String = ""
    @Published var isConnected: Bool = false
    @Published var isSpeaking: Bool = false

    private let openAIService: OpenAIService
    private let elevenLabsService: ElevenLabsService
    private let audioEngine: AudioEngine

    private var cancellables = Set<AnyCancellable>()

    init(
        openAIService: OpenAIService,
        elevenLabsService: ElevenLabsService,
        audioEngine: AudioEngine
    ) {
        self.openAIService = openAIService
        self.elevenLabsService = elevenLabsService
        self.audioEngine = audioEngine

        setupBindings()
    }

    private func setupBindings() {
        // Transcription updates
        openAIService.transcriptionPublisher
            .receive(on: DispatchQueue.main)
            .assign(to: &$originalText)

        // Translation updates
        openAIService.translationPublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] translation in
                self?.translatedText = translation
                self?.speakTranslation(translation)
            }
            .store(in: &cancellables)

        // Connection state
        openAIService.connectionStatePublisher
            .receive(on: DispatchQueue.main)
            .assign(to: &$isConnected)

        // TTS playback state
        elevenLabsService.audioPlaybackPublisher
            .receive(on: DispatchQueue.main)
            .assign(to: &$isSpeaking)

        // Audio data streaming
        audioEngine.audioDataPublisher
            .sink { [weak self] audioData in
                Task {
                    try? await self?.openAIService.sendAudioChunk(audioData)
                }
            }
            .store(in: &cancellables)
    }

    @MainActor
    func startSession() async {
        do {
            try await openAIService.connect()
            try audioEngine.start()
        } catch {
            print("Failed to start session: \(error)")
        }
    }

    @MainActor
    func stopSession() {
        openAIService.disconnect()
        audioEngine.stop()
        elevenLabsService.stop()
    }

    private func speakTranslation(_ text: String) {
        Task {
            try? await elevenLabsService.synthesize(
                text: text,
                voice: .rachel
            )
        }
    }
}
```

---

## Common Tasks

### Task: Handle API Errors with Retry

```swift
extension OpenAIService {
    func connectWithRetry(maxAttempts: Int = 3) async throws {
        var attempts = 0
        var lastError: Error?

        while attempts < maxAttempts {
            do {
                try await connect()
                return
            } catch {
                lastError = error
                attempts += 1

                if attempts < maxAttempts {
                    let delay = Double(attempts) * 2.0
                    try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                }
            }
        }

        throw lastError ?? APIError.networkError(NSError())
    }
}
```

### Task: Monitor API Quota

```swift
class APIQuotaMonitor {
    @Published var charactersUsed: Int = 0
    @Published var charactersRemaining: Int = 100_000

    func trackUsage(text: String) {
        let characters = text.count
        charactersUsed += characters
        charactersRemaining -= characters

        // Save to UserDefaults
        UserDefaults.standard.set(charactersUsed, forKey: "elevenLabsCharactersUsed")

        // Warn if low
        if charactersRemaining < 10_000 {
            NotificationCenter.default.post(
                name: .quotaLow,
                object: nil,
                userInfo: ["remaining": charactersRemaining]
            )
        }
    }
}

extension Notification.Name {
    static let quotaLow = Notification.Name("quotaLow")
}
```

---

## Critical Rules

1. **API Keys in Config** - Never hardcode API keys in code
2. **Error Handling** - Always handle network errors gracefully
3. **Retry Logic** - Implement exponential backoff for retries
4. **Base64 Encoding** - OpenAI requires base64-encoded audio
5. **WebSocket Lifecycle** - Properly connect, disconnect, and clean up
6. **Async/Await** - Use modern concurrency patterns
7. **[weak self]** - Prevent retain cycles in closures
8. **Main Thread UI** - Update UI on main thread with @MainActor
9. **Rate Limiting** - Respect API rate limits
10. **Quota Monitoring** - Track usage to prevent overages

---

## API Documentation

### OpenAI Realtime API

**WebSocket URL:**
```
wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01
```

**Headers:**
```
Authorization: Bearer {api_key}
OpenAI-Beta: realtime=v1
```

**Key Events:**
- `session.update` - Configure session
- `input_audio_buffer.append` - Send audio
- `conversation.item.input_audio_transcription.completed` - Receive transcription
- `response.text.delta` - Receive translation chunks
- `error` - API errors

### ElevenLabs API

**Endpoint:**
```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream
```

**Headers:**
```
xi-api-key: {api_key}
Content-Type: application/json
```

**Body:**
```json
{
  "text": "Translation text",
  "model_id": "eleven_multilingual_v2",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75
  }
}
```

---

## Tools & Files

**Key Files:**
- `Omen/Services/OpenAIService.swift` - OpenAI Realtime API client
- `Omen/Services/ElevenLabsService.swift` - ElevenLabs TTS client
- `Omen/ViewModels/OmenViewModel.swift` - Service orchestration

**Testing:**
- **Postman** - Test REST endpoints
- **WebSocket clients** - Test WebSocket connections
- **Xcode Console** - Monitor network logs

---

**Status:** ✅ Production Ready
**Last Updated:** 2026-01-15
