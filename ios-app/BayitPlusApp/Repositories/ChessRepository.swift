import BayitNetworking
import Foundation

/// Repository protocol for chess game API operations and WebSocket connectivity.
protocol ChessRepository: Sendable {

    /// Create a new chess game with the specified mode.
    /// - Parameters:
    ///   - mode: Game mode (pvp or bot).
    ///   - botDifficulty: Difficulty level when playing against a bot.
    /// - Returns: The created chess game.
    func createGame(mode: String, botDifficulty: String?) async throws -> ChessGame

    /// Fetch the current state of a chess game.
    /// - Parameter gameId: The game identifier.
    /// - Returns: Current game state.
    func getGameState(gameId: String) async throws -> ChessGame

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

    func createGame(mode: String, botDifficulty: String?) async throws -> ChessGame {
        struct CreateRequest: Encodable, Sendable {
            let mode: String
            let botDifficulty: String?
            enum CodingKeys: String, CodingKey {
                case mode
                case botDifficulty = "bot_difficulty"
            }
        }

        return try await client.post(
            "/api/v1/chess/create",
            body: CreateRequest(mode: mode, botDifficulty: botDifficulty),
            as: ChessGame.self
        )
    }

    func getGameState(gameId: String) async throws -> ChessGame {
        return try await client.get(
            "/api/v1/chess/\(gameId)",
            as: ChessGame.self
        )
    }

    func connectWebSocket(
        gameCode: String,
        authToken: String
    ) async throws -> WebSocketConnection {
        let wsBaseURL = await client.configuration.baseURL
        let wsURLString = wsBaseURL.absoluteString
            .replacingOccurrences(of: "http://", with: "ws://")
            .replacingOccurrences(of: "https://", with: "wss://")
            .replacingOccurrences(of: "/api/v1", with: "")

        guard let url = URL(string: "\(wsURLString)/ws/chess/\(gameCode)") else {
            throw APIError.networkError(underlying: "Invalid chess WebSocket URL")
        }

        return try await webSocketManager.connect(to: url, authToken: authToken)
    }
}
