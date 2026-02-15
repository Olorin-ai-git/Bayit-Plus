import BayitCore
import BayitNetworking
import Foundation
import Observation

/// WebSocket service for receiving real-time live subtitle translations.
/// Uses auth-first protocol with server-side audio capture (no client audio sending).
@Observable
final class LiveSubtitlesWebSocketService {
    private(set) var isConnected = false
    private(set) var currentCue: LiveSubtitleCueData?
    private(set) var connectionInfo: LiveSubtitleConnectionMessage?
    private(set) var error: String?
    private(set) var isQuotaExceeded = false

    private var webSocketTask: URLSessionWebSocketTask?
    private let urlSession: URLSession
    private let configuration: any EnvironmentConfiguration
    private let authTokenProvider: AuthTokenProvider
    private let logger = BayitLogger(category: "LiveSubtitlesWebSocket")

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

    deinit {
        webSocketTask?.cancel(with: .normalClosure, reason: nil)
    }

    @MainActor
    func connect(channelId: String, targetLanguage: String, sourceLang: String) {
        // Derive API path prefix from apiBaseURL (e.g., /api/v1) to match backend route registration
        var wsURL = configuration.webSocketBaseURL
        for component in configuration.apiBaseURL.pathComponents where component != "/" {
            wsURL = wsURL.appendingPathComponent(component)
        }
        wsURL = wsURL
            .appendingPathComponent("ws")
            .appendingPathComponent("live")
            .appendingPathComponent(channelId)
            .appendingPathComponent("subtitles")

        var urlComponents = URLComponents(url: wsURL, resolvingAgainstBaseURL: false)
        urlComponents?.queryItems = [
            URLQueryItem(name: "source_lang", value: sourceLang),
            URLQueryItem(name: "target_lang", value: targetLanguage),
            URLQueryItem(name: "audio_source", value: "server"),
            URLQueryItem(name: "platform", value: Self.platformIdentifier)
        ]

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

        logger.info("Subtitle WebSocket connection initiated", context: [
            "channelId": channelId,
            "targetLanguage": targetLanguage,
            "sourceLang": sourceLang,
            "audioSource": "server"
        ])
    }

    @MainActor
    func disconnect() {
        webSocketTask?.cancel(with: .normalClosure, reason: nil)
        webSocketTask = nil
        isConnected = false
        connectionInfo = nil
        currentCue = nil
        isQuotaExceeded = false
        logger.info("Subtitle WebSocket disconnected")
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
                    self.logger.info("Subtitle auth message sent")
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

            // Decode the type discriminator first
            guard let typeMsg = try? decoder.decode(LiveSubtitleTypeMessage.self, from: data) else {
                return
            }

            switch typeMsg.type {
            case "connected":
                if let conn = try? decoder.decode(LiveSubtitleConnectionMessage.self, from: data) {
                    Task { @MainActor in
                        self.connectionInfo = conn
                        self.isConnected = true
                        self.error = nil
                        self.logger.info("Subtitle connection established", context: [
                            "channelId": conn.channelId ?? "unknown"
                        ])
                    }
                }

            case "final_subtitle", "partial_subtitle":
                if let cueMsg = try? decoder.decode(LiveSubtitleCueMessage.self, from: data),
                   let cue = cueMsg.data {
                    Task { @MainActor in self.currentCue = cue }
                }

            case "ping":
                break // Server heartbeat, no action needed

            case "quota_exceeded":
                Task { @MainActor in
                    self.isQuotaExceeded = true
                    self.error = typeMsg.message ?? "Usage limit reached"
                    self.isConnected = false
                    self.logger.warning("Subtitle quota exceeded")
                }

            case "error":
                Task { @MainActor in
                    self.error = typeMsg.message ?? "Server error"
                    if typeMsg.recoverable != true {
                        self.isConnected = false
                    }
                    self.logger.error("Server error", context: [
                        "message": typeMsg.message ?? "unknown"
                    ])
                }

            default:
                break
            }

        case .data:
            break
        @unknown default:
            break
        }
    }
}
