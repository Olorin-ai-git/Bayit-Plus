import BayitCore
import BayitNetworking
import Foundation
import Observation

/// WebSocket service for real-time live dubbing audio and translation streams.
/// Implements auth-first protocol with token refresh and sync status reporting.
@Observable
final class LiveDubbingWebSocketService {
    private(set) var isConnected = false
    private(set) var latency: DubbingLatencyMessage?
    private(set) var currentAudio: DubbingAudioMessage?
    private(set) var connectionInfo: DubbingConnectionMessage?
    private(set) var error: String?

    private var webSocketTask: URLSessionWebSocketTask?
    private let urlSession: URLSession
    private let configuration: any EnvironmentConfiguration
    private let authTokenProvider: AuthTokenProvider
    private let logger = BayitLogger(category: "LiveDubbingWebSocket")

    private static var platformIdentifier: String {
        #if os(tvOS)
        return "tvos"
        #else
        return "ios"
        #endif
    }

    init(configuration: any EnvironmentConfiguration, authTokenProvider: AuthTokenProvider) {
        self.configuration = configuration
        self.authTokenProvider = authTokenProvider
        self.urlSession = URLSession(configuration: .default)
    }

    @MainActor
    func connect(channelId: String, targetLanguage: String, voiceId: String?) {
        let wsURL = configuration.webSocketBaseURL
            .appendingPathComponent("live-dubbing/stream")
        var urlComponents = URLComponents(url: wsURL, resolvingAgainstBaseURL: false)
        var queryItems = [
            URLQueryItem(name: "channel_id", value: channelId),
            URLQueryItem(name: "target_language", value: targetLanguage),
            URLQueryItem(name: "platform", value: Self.platformIdentifier)
        ]
        if let voiceId = voiceId {
            queryItems.append(URLQueryItem(name: "voice_id", value: voiceId))
        }
        urlComponents?.queryItems = queryItems

        guard let url = urlComponents?.url else {
            error = "Failed to construct WebSocket URL"
            logger.error("Invalid WebSocket URL construction", context: [
                "channelId": channelId,
                "targetLanguage": targetLanguage
            ])
            return
        }

        webSocketTask = urlSession.webSocketTask(with: url)
        webSocketTask?.resume()

        Task {
            await sendAuthMessage()
        }

        receiveMessages()

        logger.info("WebSocket connection initiated", context: [
            "channelId": channelId,
            "targetLanguage": targetLanguage,
            "voiceId": voiceId ?? "default"
        ])
    }

    @MainActor
    func disconnect() {
        webSocketTask?.cancel(with: .normalClosure, reason: nil)
        webSocketTask = nil
        isConnected = false
        connectionInfo = nil
        logger.info("WebSocket disconnected")
    }

    @MainActor
    func sendSyncStatus(currentVideoTimeMs: Int) {
        guard isConnected else { return }

        let message = DubbingSyncStatusMessage(currentVideoTimeMs: currentVideoTimeMs)
        guard let data = try? JSONEncoder().encode(message),
              let jsonString = String(data: data, encoding: .utf8) else {
            return
        }

        webSocketTask?.send(.string(jsonString)) { error in
            if let error = error {
                Task { @MainActor in
                    self.logger.error("Failed to send sync status", error: error)
                }
            }
        }
    }

    private func sendAuthMessage() async {
        guard let token = try? await authTokenProvider.currentToken() else {
            await MainActor.run {
                error = "No auth token available"
                isConnected = false
            }
            return
        }

        let authMessage = DubbingWebSocketAuthMessage(token: token)
        guard let data = try? JSONEncoder().encode(authMessage),
              let jsonString = String(data: data, encoding: .utf8) else {
            return
        }

        webSocketTask?.send(.string(jsonString)) { error in
            if let error = error {
                Task { @MainActor in
                    self.error = "Authentication failed: \(error.localizedDescription)"
                    self.isConnected = false
                    self.logger.error("Auth message send failed", error: error)
                }
            } else {
                Task { @MainActor in
                    self.logger.info("Auth message sent")
                }
            }
        }
    }

    private func receiveMessages() {
        webSocketTask?.receive { [weak self] result in
            switch result {
            case .success(let message):
                self?.handleMessage(message)
                self?.receiveMessages()
            case .failure(let err):
                Task { @MainActor in
                    self?.error = err.localizedDescription
                    self?.isConnected = false
                    self?.logger.error("WebSocket receive failed", error: err)
                }
            }
        }
    }

    private func handleMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            guard let data = text.data(using: .utf8) else { return }
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase

            // Try to decode as connection message first
            if let conn = try? decoder.decode(DubbingConnectionMessage.self, from: data) {
                Task { @MainActor in
                    self.connectionInfo = conn
                    self.isConnected = true
                    self.error = nil
                    self.logger.info("Connection established", context: [
                        "sessionId": conn.sessionId ?? "unknown",
                        "syncDelayMs": String(conn.syncDelayMs ?? 0)
                    ])
                }
            } else if let audio = try? decoder.decode(DubbingAudioMessage.self, from: data) {
                Task { @MainActor in self.currentAudio = audio }
            } else if let lat = try? decoder.decode(DubbingLatencyMessage.self, from: data) {
                Task { @MainActor in self.latency = lat }
            } else if text.contains("\"error\"") {
                Task { @MainActor in
                    self.error = "Server error received"
                    self.isConnected = false
                    self.logger.error("Server error message", context: ["message": text])
                }
            }
        case .data:
            break
        @unknown default:
            break
        }
    }
}
