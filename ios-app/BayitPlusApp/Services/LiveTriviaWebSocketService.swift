import BayitCore
import BayitNetworking
import Foundation

/// WebSocket service for receiving live trivia facts during live channel playback.
/// Delegates connection management to the centralized `WebSocketManager`.
final class LiveTriviaWebSocketService: @unchecked Sendable {
    private var connection: WebSocketConnection?
    private var connectionId: UUID?
    private var receiveTask: Task<Void, Never>?
    private let webSocketManager: WebSocketManager
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

    init(
        webSocketManager: WebSocketManager,
        configuration: any EnvironmentConfiguration,
        authTokenProvider: AuthTokenProvider
    ) {
        self.webSocketManager = webSocketManager
        self.configuration = configuration
        self.authTokenProvider = authTokenProvider
    }

    func connect(channelId: String, targetLanguage: String) {
        guard connection == nil else { return }

        onConnectionStatusChanged?(.connecting)

        var wsURL = configuration.webSocketBaseURL
        for component in configuration.apiBaseURL.pathComponents where component != "/" {
            wsURL = wsURL.appendingPathComponent(component)
        }
        wsURL = wsURL
            .appendingPathComponent("ws")
            .appendingPathComponent("live")
            .appendingPathComponent(channelId)
            .appendingPathComponent("trivia")

        var urlComponents = URLComponents(url: wsURL, resolvingAgainstBaseURL: true)
        urlComponents?.queryItems = [
            URLQueryItem(name: "target_language", value: targetLanguage),
            URLQueryItem(name: "platform", value: Self.platformIdentifier),
        ]

        guard let url = urlComponents?.url else {
            onConnectionStatusChanged?(.error("Invalid WebSocket URL"))
            return
        }

        Task { [weak self] in
            guard let self else { return }
            do {
                guard let token = try await authTokenProvider.currentToken() else {
                    self.onConnectionStatusChanged?(.error("No auth token"))
                    return
                }

                let conn = try await webSocketManager.connect(to: url, authToken: token)
                let connId = await conn.id
                self.connection = conn
                self.connectionId = connId
                self.onConnectionStatusChanged?(.connected)
                self.startReceiving(connection: conn)

                self.logger.info("Connecting to live trivia WebSocket", context: [
                    "channelId": channelId,
                    "language": targetLanguage,
                ])
            } catch {
                self.onConnectionStatusChanged?(.error(error.localizedDescription))
                self.logger.error("Trivia WebSocket connect failed", error: error)
            }
        }
    }

    func disconnect() {
        receiveTask?.cancel()
        receiveTask = nil

        if let connId = connectionId {
            let manager = webSocketManager
            Task { await manager.disconnect(id: connId) }
        }

        connection = nil
        connectionId = nil
        onConnectionStatusChanged?(.disconnected)
        logger.info("Disconnected from live trivia WebSocket")
    }

    /// Request a follow-up fact for a given fact chain via the WebSocket.
    func requestFollowUp(factId: String, chainId: String?) {
        guard let conn = connection else { return }

        var message: [String: Any] = [
            "type": "follow_up",
            "fact_id": factId,
        ]
        if let chainId {
            message["chain_id"] = chainId
        }

        guard let data = try? JSONSerialization.data(withJSONObject: message),
              let jsonString = String(data: data, encoding: .utf8)
        else {
            return
        }

        Task {
            do {
                try await conn.send(message: jsonString)
            } catch {
                self.logger.error("Failed to send follow-up request", context: [
                    "error": error.localizedDescription,
                    "factId": factId,
                ])
            }
        }
    }

    private func startReceiving(connection: WebSocketConnection) {
        receiveTask = Task { [weak self] in
            let stream = await connection.receive()
            for await text in stream {
                guard !Task.isCancelled else { break }
                self?.handleMessage(text)
            }

            self?.onConnectionStatusChanged?(.disconnected)
        }
    }

    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String
        else {
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
