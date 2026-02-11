import BayitCore
import BayitNetworking
import Foundation
import Observation

/// ViewModel for live channel chat with WebSocket.
/// Shared across iOS and tvOS.
@MainActor
@Observable
final class ChannelChatViewModel {

    private(set) var messages: [ChannelChatMessage] = []
    private(set) var isConnected = false
    private(set) var isLoading = false
    private(set) var error: String?
    var inputText = ""

    private let repository: any LiveTVRepository
    private let webSocketManager: WebSocketManager
    private let logger = BayitLogger(category: "ChannelChatViewModel")
    private var connection: WebSocketConnection?
    private var channelId: String?
    private var receiveTask: Task<Void, Never>?

    init(repository: any LiveTVRepository, webSocketManager: WebSocketManager) {
        self.repository = repository
        self.webSocketManager = webSocketManager
    }

    func connect(channelId: String, authToken: String) async {
        self.channelId = channelId
        isLoading = true
        error = nil

        do {
            let history = try await repository.fetchChannelChatHistory(channelId: channelId)
            messages = history.messages ?? []
        } catch {
            logger.error("Failed to load chat history", error: error)
        }

        do {
            let baseURL = await webSocketManager.configuration.baseURL
            let wsScheme = baseURL.scheme == "https" ? "wss" : "ws"
            let host = baseURL.host ?? "localhost"
            let port = baseURL.port.map { ":\($0)" } ?? ""
            let urlString = "\(wsScheme)://\(host)\(port)/ws/channel-chat/\(channelId)"

            guard let url = URL(string: urlString) else {
                throw APIError.networkError(underlying: "Invalid WebSocket URL for channel chat")
            }

            connection = try await webSocketManager.connect(to: url, authToken: authToken)
            isConnected = true
            listenForMessages()
            logger.info("Channel chat connected", context: ["channelId": channelId])
        } catch {
            self.error = "Unable to connect to chat"
            logger.error("Chat WebSocket connection failed", error: error)
        }

        isLoading = false
    }

    func sendMessage() {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, let channelId else { return }

        let payload = ChannelChatSendRequest(content: text, channelId: channelId)
        guard let data = try? JSONEncoder().encode(payload),
              let jsonString = String(data: data, encoding: .utf8) else {
            logger.error("Failed to encode chat message")
            return
        }

        Task {
            do {
                try await connection?.send(message: jsonString)
                inputText = ""
            } catch {
                logger.error("Failed to send chat message", error: error)
            }
        }
    }

    func disconnect() {
        receiveTask?.cancel()
        receiveTask = nil
        Task {
            await connection?.disconnect()
        }
        connection = nil
        isConnected = false
        logger.info("Channel chat disconnected")
    }

    private func listenForMessages() {
        guard let connection else { return }
        receiveTask = Task { [weak self] in
            let stream = await connection.receive()
            for await message in stream {
                await self?.handleMessage(message)
            }
            await MainActor.run { self?.isConnected = false }
        }
    }

    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        do {
            let chatMessage = try decoder.decode(ChannelChatMessage.self, from: data)
            messages.append(chatMessage)
        } catch {
            logger.error("Failed to decode chat message", error: error)
        }
    }
}
