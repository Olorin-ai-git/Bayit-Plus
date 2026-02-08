import BayitCore
import Foundation
import Observation

/// WebSocket service for real-time live dubbing audio and translation streams.
///
/// Connects to the live-dubbing/stream endpoint and receives audio data,
/// translated text, and latency metrics via WebSocket messages.
@Observable
final class LiveDubbingWebSocketService {
    private(set) var isConnected = false
    private(set) var latency: DubbingLatencyMessage?
    private(set) var currentAudio: DubbingAudioMessage?
    private(set) var error: String?

    private var webSocketTask: URLSessionWebSocketTask?
    private let configuration: any EnvironmentConfiguration
    private let logger = BayitLogger(category: "LiveDubbingWebSocket")

    init(configuration: any EnvironmentConfiguration) {
        self.configuration = configuration
    }

    @MainActor
    func connect(channelId: String, targetLanguage: String) {
        let wsURL = configuration.webSocketBaseURL
            .appendingPathComponent("live-dubbing/stream")
        var urlComponents = URLComponents(url: wsURL, resolvingAgainstBaseURL: false)
        urlComponents?.queryItems = [
            URLQueryItem(name: "channel_id", value: channelId),
            URLQueryItem(name: "target_language", value: targetLanguage)
        ]
        guard let url = urlComponents?.url else {
            error = "Failed to construct WebSocket URL"
            logger.error("Invalid WebSocket URL construction", context: [
                "channelId": channelId,
                "targetLanguage": targetLanguage
            ])
            return
        }

        let session = URLSession(configuration: .default)
        webSocketTask = session.webSocketTask(with: url)
        webSocketTask?.resume()
        isConnected = true
        error = nil
        logger.info("WebSocket connected", context: [
            "channelId": channelId,
            "targetLanguage": targetLanguage
        ])
        receiveMessages()
    }

    @MainActor
    func disconnect() {
        webSocketTask?.cancel(with: .normalClosure, reason: nil)
        webSocketTask = nil
        isConnected = false
        logger.info("WebSocket disconnected")
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
                    self?.logger.error(
                        "WebSocket receive failed",
                        error: err
                    )
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

            if let audio = try? decoder.decode(DubbingAudioMessage.self, from: data) {
                Task { @MainActor in self.currentAudio = audio }
            } else if let lat = try? decoder.decode(DubbingLatencyMessage.self, from: data) {
                Task { @MainActor in self.latency = lat }
            }
        case .data:
            break
        @unknown default:
            break
        }
    }
}
