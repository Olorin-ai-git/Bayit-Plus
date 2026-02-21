import BayitNetworking
import Foundation

/// Repository protocol for direct message API operations and WebSocket connectivity.
protocol DirectMessageRepository: Sendable {
    /// Fetch all conversations for the current user.
    func fetchConversations() async throws -> [ConversationSummary]

    /// Fetch messages in a conversation with a friend.
    func fetchMessages(friendId: String) async throws -> [DirectMessageModel]

    /// Send a text message to a friend.
    func sendMessage(friendId: String, message: String) async throws -> DirectMessageModel

    /// Mark a single message as read.
    func markAsRead(messageId: String) async throws

    /// Mark all messages in a conversation as read.
    func markAllRead(friendId: String) async throws

    /// Request translation for a message.
    func translateMessage(messageId: String) async throws -> DirectMessageModel

    /// Add a reaction to a message.
    func addReaction(messageId: String, reaction: String) async throws

    /// Open a WebSocket connection for real-time DM updates.
    func connectWebSocket(
        friendId: String,
        authToken: String
    ) async throws -> WebSocketConnection
}

/// API implementation of `DirectMessageRepository` using `APIClient` and `WebSocketManager`.
final class APIDirectMessageRepository: DirectMessageRepository, @unchecked Sendable {
    private let client: APIClient
    private let webSocketManager: WebSocketManager

    init(client: APIClient, webSocketManager: WebSocketManager) {
        self.client = client
        self.webSocketManager = webSocketManager
    }

    func fetchConversations() async throws -> [ConversationSummary] {
        return try await client.get("/api/v1/dm/conversations", as: [ConversationSummary].self)
    }

    func fetchMessages(friendId: String) async throws -> [DirectMessageModel] {
        return try await client.get("/api/v1/dm/\(friendId)", as: [DirectMessageModel].self)
    }

    func sendMessage(friendId: String, message: String) async throws -> DirectMessageModel {
        struct SendRequest: Encodable, Sendable { let message: String }
        return try await client.post(
            "/api/v1/dm/\(friendId)",
            body: SendRequest(message: message),
            as: DirectMessageModel.self
        )
    }

    func markAsRead(messageId: String) async throws {
        let _: EmptyResponse = try await client.post(
            "/api/v1/dm/\(messageId)/read",
            body: EmptyBody(),
            as: EmptyResponse.self
        )
    }

    func markAllRead(friendId: String) async throws {
        let _: EmptyResponse = try await client.post(
            "/api/v1/dm/read-all/\(friendId)",
            body: EmptyBody(),
            as: EmptyResponse.self
        )
    }

    func translateMessage(messageId: String) async throws -> DirectMessageModel {
        return try await client.post(
            "/api/v1/dm/\(messageId)/translate",
            body: EmptyBody(),
            as: DirectMessageModel.self
        )
    }

    func addReaction(messageId: String, reaction: String) async throws {
        struct ReactionRequest: Encodable, Sendable { let reaction: String }
        let _: EmptyResponse = try await client.post(
            "/api/v1/dm/\(messageId)/react",
            body: ReactionRequest(reaction: reaction),
            as: EmptyResponse.self
        )
    }

    func connectWebSocket(
        friendId: String,
        authToken: String
    ) async throws -> WebSocketConnection {
        let wsBaseURL = await webSocketManager.configuration.webSocketBaseURL

        guard let url = URL(string: "\(wsBaseURL.absoluteString)/ws/dm/\(friendId)") else {
            throw APIError.networkError(underlying: "Invalid DM WebSocket URL")
        }

        return try await webSocketManager.connect(to: url, authToken: authToken)
    }
}
