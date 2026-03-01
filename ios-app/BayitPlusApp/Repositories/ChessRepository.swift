import BayitNetworking
import Foundation

/// Repository protocol for chess game API operations and WebSocket connectivity.
protocol ChessRepository: Sendable {
    /// Create a new chess game with the specified mode and color.
    /// - Parameters:
    ///   - color: Preferred piece color (white or black).
    ///   - gameMode: Game mode (pvp or bot).
    ///   - botDifficulty: Difficulty level when playing against a bot.
    /// - Returns: The created chess game.
    func createGame(color: String, gameMode: String, botDifficulty: String?) async throws -> ChessGame

    /// Fetch the current state of a chess game.
    /// - Parameter gameId: The game identifier.
    /// - Returns: Current game state.
    func getGameState(gameId: String) async throws -> ChessGame

    /// Join an existing chess game by game code.
    /// - Parameter gameCode: The 6-character game code.
    /// - Returns: The joined chess game.
    func joinGame(gameCode: String) async throws -> ChessGame

    /// Invite a friend to a chess game.
    /// - Parameters:
    ///   - friendName: The friend's display name.
    ///   - color: Preferred piece color.
    ///   - timeControl: Optional time control in seconds.
    /// - Returns: The created chess game.
    func invitePlayer(friendName: String, color: String, timeControl: String?) async throws -> ChessGame

    /// Open a WebSocket connection for real-time chess moves.
    /// - Parameters:
    ///   - gameCode: The game code for the WebSocket path.
    ///   - authToken: Bearer token for the auth handshake.
    /// - Returns: A `WebSocketConnection` for send/receive.
    func connectWebSocket(
        gameCode: String,
        authToken: String
    ) async throws -> WebSocketConnection
}

/// API implementation of chess repository using `APIClient` and `WebSocketManager`.
final class APIChessRepository: ChessRepository, @unchecked Sendable {
    private let client: APIClient
    private let webSocketManager: WebSocketManager

    init(client: APIClient, webSocketManager: WebSocketManager) {
        self.client = client
        self.webSocketManager = webSocketManager
    }

    // MARK: - ChessRepository

    func createGame(color: String, gameMode: String, botDifficulty: String?) async throws -> ChessGame {
        struct CreateRequest: Encodable, Sendable {
            let color: String
            let gameMode: String
            let botDifficulty: String?
            enum CodingKeys: String, CodingKey {
                case color
                case gameMode = "game_mode"
                case botDifficulty = "bot_difficulty"
            }
        }

        return try await client.post(
            "/api/v1/chess/create",
            body: CreateRequest(color: color, gameMode: gameMode, botDifficulty: botDifficulty),
            as: ChessGame.self
        )
    }

    func getGameState(gameId: String) async throws -> ChessGame {
        return try await client.get(
            "/api/v1/chess/\(gameId)",
            as: ChessGame.self
        )
    }

    func joinGame(gameCode: String) async throws -> ChessGame {
        struct JoinRequest: Encodable, Sendable {
            let gameCode: String
            enum CodingKeys: String, CodingKey {
                case gameCode = "game_code"
            }
        }
        return try await client.post(
            "/api/v1/chess/join",
            body: JoinRequest(gameCode: gameCode),
            as: ChessGame.self
        )
    }

    func invitePlayer(friendName: String, color: String, timeControl: String?) async throws -> ChessGame {
        struct InviteRequest: Encodable, Sendable {
            let friendName: String
            let color: String
            let timeControl: String?
            enum CodingKeys: String, CodingKey {
                case friendName = "friend_name"
                case color
                case timeControl = "time_control"
            }
        }
        return try await client.post(
            "/api/v1/chess/invite",
            body: InviteRequest(friendName: friendName, color: color, timeControl: timeControl),
            as: ChessGame.self
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
