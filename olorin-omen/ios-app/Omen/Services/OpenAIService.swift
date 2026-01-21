import Foundation
import Combine

/// OpenAI Realtime API service for speech transcription and translation
class OpenAIService: ObservableObject {
    // MARK: - Published Properties

    /// Connection status
    @Published private(set) var isConnected = false

    /// Current transcript (original language)
    @Published private(set) var currentCaption = ""

    /// Current translation (target language)
    @Published private(set) var currentTranslation = ""

    /// Error message
    @Published private(set) var errorMessage: String?

    // MARK: - Private Properties

    private var webSocketTask: URLSessionWebSocketTask?
    private let session: URLSession
    private var reconnectAttempts = 0
    private let maxReconnectAttempts = 5

    private let apiKey: String
    private var targetLanguage: String = "Spanish"

    // MARK: - Constants

    private let baseURL = "wss://api.openai.com/v1/realtime"
    private let model = "gpt-4o-realtime-preview-2024-10-01"

    // MARK: - Initialization

    init(apiKey: String) {
        self.apiKey = apiKey

        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 300
        self.session = URLSession(configuration: configuration)
    }

    // MARK: - Public Methods

    /// Connect to OpenAI Realtime API
    func connect(targetLanguage: String) async throws {
        self.targetLanguage = targetLanguage

        guard !isConnected else { return }

        var urlComponents = URLComponents(string: baseURL)
        urlComponents?.queryItems = [
            URLQueryItem(name: "model", value: model)
        ]

        guard let url = urlComponents?.url else {
            throw OpenAIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("realtime=v1", forHTTPHeaderField: "OpenAI-Beta")

        webSocketTask = session.webSocketTask(with: request)
        webSocketTask?.resume()

        await MainActor.run {
            isConnected = true
            errorMessage = nil
            reconnectAttempts = 0
        }

        // Configure session
        try await configureSession()

        // Start receiving messages
        Task {
            await receiveMessages()
        }
    }

    /// Disconnect from OpenAI
    func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil

        Task { @MainActor in
            isConnected = false
        }
    }

    /// Send audio data to OpenAI
    func sendAudio(_ sample: AudioSample) async throws {
        guard isConnected else {
            throw OpenAIError.notConnected
        }

        let message: [String: Any] = [
            "type": "input_audio_buffer.append",
            "audio": sample.toBase64()
        ]

        try await sendMessage(message)
    }

    // MARK: - Private Methods

    /// Configure session with translation instructions
    private func configureSession() async throws {
        let sessionConfig: [String: Any] = [
            "type": "session.update",
            "session": [
                "instructions": """
                    You are a real-time transcription and translation assistant.
                    Transcribe the user's speech accurately in their original language.
                    Simultaneously translate their speech into \(targetLanguage).
                    Provide both the original transcript and the translation as they speak.
                    Be concise and natural in both transcription and translation.
                    """
            ]
        ]

        try await sendMessage(sessionConfig)
    }

    /// Send JSON message to WebSocket
    private func sendMessage(_ message: [String: Any]) async throws {
        guard let data = try? JSONSerialization.data(withJSONObject: message),
              let jsonString = String(data: data, encoding: .utf8) else {
            throw OpenAIError.encodingFailed
        }

        let wsMessage = URLSessionWebSocketTask.Message.string(jsonString)
        try await webSocketTask?.send(wsMessage)
    }

    /// Receive messages from WebSocket
    private func receiveMessages() async {
        guard let webSocketTask = webSocketTask else { return }

        do {
            let message = try await webSocketTask.receive()

            switch message {
            case .string(let text):
                await processMessage(text)
            case .data(let data):
                if let text = String(data: data, encoding: .utf8) {
                    await processMessage(text)
                }
            @unknown default:
                break
            }

            // Continue receiving
            if isConnected {
                await receiveMessages()
            }
        } catch {
            await handleConnectionError(error)
        }
    }

    /// Process incoming message
    private func processMessage(_ text: String) async {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else {
            return
        }

        switch type {
        case "response.audio_transcript.delta":
            if let delta = json["delta"] as? String {
                await MainActor.run {
                    currentCaption += delta
                }
            }

        case "response.text.delta":
            if let delta = json["delta"] as? String {
                await MainActor.run {
                    currentTranslation += delta
                }
            }

        case "response.audio_transcript.done":
            // Transcript complete, could trigger completion callback
            break

        case "error":
            if let error = json["error"] as? [String: Any],
               let message = error["message"] as? String {
                await MainActor.run {
                    errorMessage = message
                }
            }

        default:
            // Handle other message types if needed
            break
        }
    }

    /// Handle connection error and attempt reconnect
    private func handleConnectionError(_ error: Error) async {
        await MainActor.run {
            isConnected = false
            errorMessage = error.localizedDescription
        }

        // Attempt reconnection with exponential backoff
        if reconnectAttempts < maxReconnectAttempts {
            reconnectAttempts += 1
            let delay = min(pow(2.0, Double(reconnectAttempts)), 8.0)

            try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))

            do {
                try await connect(targetLanguage: targetLanguage)
            } catch {
                await MainActor.run {
                    errorMessage = "Reconnection failed: \(error.localizedDescription)"
                }
            }
        }
    }

    /// Clear transcript buffers
    func clearTranscripts() {
        Task { @MainActor in
            currentCaption = ""
            currentTranslation = ""
        }
    }
}

// MARK: - Errors

enum OpenAIError: LocalizedError {
    case invalidURL
    case notConnected
    case encodingFailed
    case apiKeyMissing
    case connectionFailed(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid WebSocket URL"
        case .notConnected:
            return "Not connected to OpenAI"
        case .encodingFailed:
            return "Failed to encode message"
        case .apiKeyMissing:
            return "OpenAI API key not configured"
        case .connectionFailed(let error):
            return "Connection failed: \(error.localizedDescription)"
        }
    }
}
