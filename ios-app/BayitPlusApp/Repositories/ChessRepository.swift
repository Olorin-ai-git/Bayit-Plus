import BayitNetworking
import Foundation

/// Repository protocol for chess game API operations and WebSocket connectivity.
protocol ChessRepository: Sendable {
    /// Create a new chess game with the specified mode and color.
    func createGame(
        color: String, gameMode: String, botDifficulty: String?, timeControl: Int?
    ) async throws -> ChessGame

    /// Fetch the current state of a chess game.
    func getGameState(gameId: String) async throws -> ChessGame

    /// Join an existing chess game by game code.
    func joinGame(gameCode: String) async throws -> ChessGame

    /// Invite a friend to a chess game by their user ID.
    func invitePlayer(friendUserId: String, color: String, timeControl: Int?) async throws -> ChessGame

    /// Fetch pending chess invites for the current user.
    func getPendingInvites() async throws -> [ChessGame]

    /// Decline a chess invite by game code.
    func declineInvite(gameCode: String) async throws

    /// Make a chess move via REST API (fallback when WebSocket is unavailable).
    func makeMove(gameCode: String, from: String, to: String) async throws -> ChessGame

    /// Load chat history for a chess game.
    func loadChatHistory(gameCode: String) async throws -> [ChessChatMessage]

    /// Send a chat message via REST (fallback when WebSocket unavailable).
    func sendChatMessage(gameCode: String, message: String) async throws -> ChessChatMessage

    /// Open a WebSocket connection for real-time chess moves.
    func connectWebSocket(
        gameCode: String,
        authToken: String
    ) async throws -> WebSocketConnection
}

/// API implementation of chess repository using `APIClient` and `WebSocketManager`.
final class APIChessRepository: ChessRepository, @unchecked Sendable {
    private let client: APIClient
    private let webSocketManager: WebSocketManager

    /// Backend wraps create/join/invite responses in {"game": {...}}.
    private struct GameEnvelope: Decodable, Sendable {
        let game: ChessGame
    }

    init(client: APIClient, webSocketManager: WebSocketManager) {
        self.client = client
        self.webSocketManager = webSocketManager
    }

    // MARK: - ChessRepository

    func createGame(
        color: String, gameMode: String, botDifficulty: String?, timeControl: Int?
    ) async throws -> ChessGame {
        struct Body: Encodable, Sendable {
            let color: String
            let gameMode: String
            let botDifficulty: String?
            let timeControl: Int?
        }
        let envelope = try await client.post(
            "/api/v1/chess/create",
            body: Body(color: color, gameMode: gameMode, botDifficulty: botDifficulty, timeControl: timeControl),
            as: GameEnvelope.self
        )
        return envelope.game
    }

    func getGameState(gameId: String) async throws -> ChessGame {
        return try await client.get(
            "/api/v1/chess/\(gameId)",
            as: ChessGame.self
        )
    }

    func joinGame(gameCode: String) async throws -> ChessGame {
        struct Body: Encodable, Sendable {
            let gameCode: String
        }
        let envelope = try await client.post(
            "/api/v1/chess/join",
            body: Body(gameCode: gameCode),
            as: GameEnvelope.self
        )
        return envelope.game
    }

    func invitePlayer(friendUserId: String, color: String, timeControl: Int?) async throws -> ChessGame {
        struct Body: Encodable, Sendable {
            let friendUserId: String
            let color: String
            let timeControl: Int?
        }
        let envelope = try await client.post(
            "/api/v1/chess/invite",
            body: Body(friendUserId: friendUserId, color: color, timeControl: timeControl),
            as: GameEnvelope.self
        )
        return envelope.game
    }

    func getPendingInvites() async throws -> [ChessGame] {
        struct InvitesEnvelope: Decodable, Sendable { let invites: [ChessGame] }
        let envelope = try await client.get("/api/v1/chess/invites/pending", as: InvitesEnvelope.self)
        return envelope.invites
    }

    func declineInvite(gameCode: String) async throws {
        struct DeclineResponse: Decodable, Sendable { let status: String }
        _ = try await client.post(
            "/api/v1/chess/\(gameCode)/decline-invite",
            body: EmptyBody(),
            as: DeclineResponse.self
        )
    }

    /// Envelope for the move endpoint response.
    private struct MoveEnvelope: Decodable, Sendable {
        let game: ChessGame
    }

    func makeMove(gameCode: String, from: String, to: String) async throws -> ChessGame {
        struct Body: Encodable, Sendable {
            let fromSquare: String
            let toSquare: String
        }
        let envelope = try await client.post(
            "/api/v1/chess/\(gameCode)/move",
            body: Body(fromSquare: from, toSquare: to),
            as: MoveEnvelope.self
        )
        return envelope.game
    }

    func loadChatHistory(gameCode: String) async throws -> [ChessChatMessage] {
        struct ChatEnvelope: Decodable, Sendable { let messages: [ChessChatMessage] }
        let envelope = try await client.get(
            "/api/v1/chess/\(gameCode)/chat",
            as: ChatEnvelope.self
        )
        return envelope.messages.reversed()
    }

    func sendChatMessage(gameCode: String, message: String) async throws -> ChessChatMessage {
        struct Body: Encodable, Sendable { let message: String }
        return try await client.post(
            "/api/v1/chess/\(gameCode)/chat",
            body: Body(message: message),
            as: ChessChatMessage.self
        )
    }

    func connectWebSocket(
        gameCode: String,
        authToken: String
    ) async throws -> WebSocketConnection {
        let wsBaseURL = await webSocketManager.configuration.webSocketBaseURL

        guard let url = URL(string: "\(wsBaseURL.absoluteString)/ws/chess/\(gameCode)") else {
            throw APIError.networkError(underlying: "Invalid chess WebSocket URL")
        }

        return try await webSocketManager.connect(to: url, authToken: authToken)
    }
}
