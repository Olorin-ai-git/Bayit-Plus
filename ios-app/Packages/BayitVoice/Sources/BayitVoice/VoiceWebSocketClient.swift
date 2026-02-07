import BayitCore
import Foundation

/// WebSocket client for the streaming voice pipeline.
///
/// Ported from shared/services/voiceWebSocketHandler.ts.
/// Uses URLSessionWebSocketTask (iOS 13+) for native WebSocket support.
/// Handles message routing, keep-alive pings, and reconnection.
public actor VoiceWebSocketClient {

    private var webSocketTask: URLSessionWebSocketTask?
    private var pingTask: Task<Void, Never>?
    private var receiveTask: Task<Void, Never>?
    private let session: URLSession
    private let logger = BayitLogger(category: "VoiceWebSocket")

    private let baseURL: URL
    private let authTokenProvider: @Sendable () async -> String?

    /// Callback for incoming messages, set by the orchestrator.
    private var onMessage: (@Sendable (VoiceWSIncoming) -> Void)?

    /// Ping interval matching voiceWebSocketHandler.ts (30 seconds)
    private let pingInterval: TimeInterval = 30

    public init(
        baseURL: URL,
        authTokenProvider: @escaping @Sendable () async -> String?
    ) {
        self.baseURL = baseURL
        self.authTokenProvider = authTokenProvider
        self.session = URLSession(configuration: .default)
    }

    // MARK: - Connection

    /// Connect to the voice WebSocket endpoint.
    ///
    /// - Parameters:
    ///   - language: Language code for the session (e.g. "en", "he")
    ///   - onMessage: Callback for incoming messages
    public func connect(
        language: String,
        onMessage: @escaping @Sendable (VoiceWSIncoming) -> Void
    ) async {
        // Close any existing connection first
        await disconnect()

        self.onMessage = onMessage

        let wsURL = baseURL.appendingPathComponent("/ws/voice")
        var request = URLRequest(url: wsURL)

        if let token = await authTokenProvider() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.setValue(language, forHTTPHeaderField: "Accept-Language")

        let task = session.webSocketTask(with: request)
        webSocketTask = task
        task.resume()

        logger.info("WebSocket connecting", context: ["url": wsURL.absoluteString])

        startReceiving()
        startPingLoop()
    }

    /// Disconnect and clean up.
    public func disconnect() {
        pingTask?.cancel()
        pingTask = nil
        receiveTask?.cancel()
        receiveTask = nil

        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        onMessage = nil

        logger.info("WebSocket disconnected")
    }

    // MARK: - Send Messages

    /// Send an audio chunk (base64-encoded).
    public func sendAudio(_ audioData: Data) async {
        let base64 = audioData.base64EncodedString()
        let message: [String: Any] = ["type": "audio", "data": base64]
        await sendJSON(message)
    }

    /// Commit the current transcript (finalize).
    public func sendCommit() async {
        await sendJSON(["type": "commit"])
    }

    /// Cancel the current processing.
    public func sendCancel() async {
        await sendJSON(["type": "cancel"])
    }

    // MARK: - Receiving

    private func startReceiving() {
        receiveTask = Task { [weak self] in
            while !Task.isCancelled {
                guard let self, let ws = await self.webSocketTask else { break }
                do {
                    let message = try await ws.receive()
                    await self.handleMessage(message)
                } catch {
                    if !Task.isCancelled {
                        await self.logger.error("WebSocket receive error", error: error)
                        await self.onMessage?(.error(error.localizedDescription))
                    }
                    break
                }
            }
        }
    }

    private func handleMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            parseTextMessage(text)
        case .data(let data):
            if let text = String(data: data, encoding: .utf8) {
                parseTextMessage(text)
            }
        @unknown default:
            break
        }
    }

    /// Parse and route incoming JSON messages.
    /// Validates message types matching voiceWebSocketHandler.ts whitelist.
    private func parseTextMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else {
            logger.warning("Invalid WebSocket message format")
            return
        }

        switch type {
        case "transcript_partial":
            if let transcript = json["text"] as? String {
                onMessage?(.transcriptPartial(transcript))
            }

        case "transcript_final":
            if let transcript = json["text"] as? String {
                onMessage?(.transcriptFinal(transcript))
            }

        case "llm_chunk":
            if let chunk = json["text"] as? String {
                onMessage?(.llmChunk(chunk))
            }

        case "tts_audio":
            if let base64 = json["data"] as? String,
               let audioData = Data(base64Encoded: base64) {
                onMessage?(.ttsAudio(audioData))
            }

        case "intent_action":
            if let intentStr = json["intent"] as? String,
               let actionText = json["text"] as? String,
               let actionDict = json["action"] as? [String: Any],
               let actionType = actionDict["type"] as? String {
                let intent = VoiceIntentType(rawValue: intentStr) ?? .unknown
                let payload = (actionDict["payload"] as? [String: Any])?.compactMapValues {
                    AnyCodable($0)
                }
                let action = VoiceAction(type: actionType, payload: payload)
                onMessage?(.intentAction(intent, actionText, action))
            }

        case "complete":
            onMessage?(.complete)

        case "cancelled":
            onMessage?(.cancelled)

        case "error":
            let errorMsg = json["message"] as? String ?? "Unknown server error"
            onMessage?(.error(errorMsg))

        case "pong":
            onMessage?(.pong)

        default:
            logger.warning("Unknown WebSocket message type", context: ["type": type])
        }
    }

    // MARK: - Ping Keep-Alive

    private func startPingLoop() {
        pingTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(self?.pingInterval ?? 30))
                guard !Task.isCancelled else { break }
                await self?.sendJSON(["type": "ping"])
            }
        }
    }

    // MARK: - Helpers

    private func sendJSON(_ dict: [String: Any]) async {
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let text = String(data: data, encoding: .utf8) else {
            return
        }
        do {
            try await webSocketTask?.send(.string(text))
        } catch {
            logger.error("WebSocket send failed", error: error)
        }
    }
}
