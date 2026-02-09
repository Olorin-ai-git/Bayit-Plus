import BayitCore
import BayitNetworking
import Foundation

/// WebSocket service for receiving live trivia facts during live channel playback
final class LiveTriviaWebSocketService {
    private var webSocket: URLSessionWebSocketTask?
    private let configuration: any EnvironmentConfiguration
    private let authTokenProvider: AuthTokenProvider
    private let logger = BayitLogger(category: "LiveTrivia")

    var onFactReceived: ((TriviaFact) -> Void)?
    var onConnectionStatusChanged: ((ConnectionStatus) -> Void)?

    enum ConnectionStatus {
        case disconnected, connecting, connected, error(String)
    }

    init(configuration: any EnvironmentConfiguration, authTokenProvider: AuthTokenProvider) {
        self.configuration = configuration
        self.authTokenProvider = authTokenProvider
    }

    func connect(channelId: String, targetLanguage: String) {
        guard webSocket == nil else { return }

        onConnectionStatusChanged?(.connecting)

        let wsURL = configuration.webSocketBaseURL
            .appendingPathComponent("ws")
            .appendingPathComponent("live")
            .appendingPathComponent(channelId)
            .appendingPathComponent("trivia")

        var urlComponents = URLComponents(url: wsURL, resolvingAgainstBaseURL: true)!
        urlComponents.queryItems = [
            URLQueryItem(name: "target_language", value: targetLanguage),
            URLQueryItem(name: "platform", value: "ios")
        ]

        let session = URLSession(configuration: .default)
        webSocket = session.webSocketTask(with: urlComponents.url!)
        webSocket?.resume()

        Task {
            await sendAuthMessage()
        }

        receiveMessage()

        logger.info("Connecting to live trivia WebSocket", context: [
            "channelId": channelId,
            "language": targetLanguage
        ])
    }

    func disconnect() {
        webSocket?.cancel(with: .goingAway, reason: nil)
        webSocket = nil
        onConnectionStatusChanged?(.disconnected)
        logger.info("Disconnected from live trivia WebSocket")
    }

    private func sendAuthMessage() async {
        guard let token = try? await authTokenProvider.currentToken() else {
            onConnectionStatusChanged?(.error("No auth token"))
            return
        }

        let authMessage = ["type": "auth", "token": token]
        guard let data = try? JSONSerialization.data(withJSONObject: authMessage),
              let jsonString = String(data: data, encoding: .utf8) else {
            return
        }

        webSocket?.send(.string(jsonString)) { [weak self] error in
            if let error = error {
                self?.logger.error("Failed to send auth", context: ["error": error.localizedDescription])
                self?.onConnectionStatusChanged?(.error(error.localizedDescription))
            } else {
                self?.onConnectionStatusChanged?(.connected)
            }
        }
    }

    private func receiveMessage() {
        webSocket?.receive { [weak self] result in
            guard let self = self else { return }

            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self.handleMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self.handleMessage(text)
                    }
                @unknown default:
                    break
                }
                self.receiveMessage() // Continue listening

            case .failure(let error):
                self.logger.error("WebSocket receive error", context: ["error": error.localizedDescription])
                self.onConnectionStatusChanged?(.error(error.localizedDescription))
            }
        }
    }

    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else {
            return
        }

        switch type {
        case "trivia_fact":
            if let fact = parseTriviaFact(from: json) {
                onFactReceived?(fact)
            }
        case "error":
            if let message = json["message"] as? String {
                onConnectionStatusChanged?(.error(message))
            }
        default:
            break
        }
    }

    private func parseTriviaFact(from json: [String: Any]) -> TriviaFact? {
        guard let id = json["id"] as? String else {
            return nil
        }

        let text = json["text"] as? String
        let textHe = json["text_he"] as? String
        let textEn = json["text_en"] as? String
        let textEs = json["text_es"] as? String
        let category = json["category"] as? String
        let timestamp = json["timestamp"] as? Double
        let languageVariants = json["language_variants"] as? [String: String]

        return TriviaFact(
            id: id,
            text: text,
            textHe: textHe,
            textEn: textEn,
            textEs: textEs,
            category: category,
            timestamp: timestamp != nil ? String(timestamp!) : nil,
            languageVariants: languageVariants
        )
    }
}
