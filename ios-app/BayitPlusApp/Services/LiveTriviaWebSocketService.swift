import BayitCore
import BayitNetworking
import Foundation

/// WebSocket service for receiving live trivia facts during live channel playback
final class LiveTriviaWebSocketService {
    private var webSocket: URLSessionWebSocketTask?
    private let configuration: any EnvironmentConfiguration
    private let authTokenProvider: AuthTokenProvider
    private let logger = BayitLogger(category: "LiveTrivia")

    private static var platformIdentifier: String {
        #if os(tvOS)
        return "tvos"
        #else
        return "ios"
        #endif
    }

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
            URLQueryItem(name: "platform", value: Self.platformIdentifier)
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

    /// Request a follow-up fact for a given fact chain via the WebSocket.
    func requestFollowUp(factId: String, chainId: String?) {
        var message: [String: Any] = [
            "type": "follow_up",
            "fact_id": factId,
        ]
        if let chainId {
            message["chain_id"] = chainId
        }

        guard let data = try? JSONSerialization.data(withJSONObject: message),
              let jsonString = String(data: data, encoding: .utf8) else {
            return
        }

        webSocket?.send(.string(jsonString)) { [weak self] error in
            if let error {
                self?.logger.error("Failed to send follow-up request", context: [
                    "error": error.localizedDescription,
                    "factId": factId,
                ])
            }
        }
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
        guard let factId = json["fact_id"] as? String ?? json["id"] as? String else {
            return nil
        }

        return TriviaFact(
            factId: factId,
            text: json["text"] as? String,
            textHe: json["text_he"] as? String,
            textEn: json["text_en"] as? String,
            textEs: json["text_es"] as? String,
            category: json["category"] as? String,
            triggerTime: json["trigger_time"] as? Double ?? json["timestamp"] as? Double,
            triggerType: json["trigger_type"] as? String ?? "random",
            displayDuration: json["display_duration"] as? Int ?? 15,
            priority: json["priority"] as? Int ?? 5,
            sourceLanguage: json["source_language"] as? String,
            translations: json["translations"] as? [String: String],
            relatedPerson: json["related_person"] as? String,
            chainId: json["chain_id"] as? String,
            chainOrder: json["chain_order"] as? Int,
            hasFollowUp: json["has_follow_up"] as? Bool,
            detectedTopic: json["detected_topic"] as? String,
            topicType: json["topic_type"] as? String
        )
    }
}
