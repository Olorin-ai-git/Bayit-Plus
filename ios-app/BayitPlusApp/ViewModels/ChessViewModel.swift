import BayitCore
import BayitNetworking
import Foundation
import Observation

/// Represents a single chess piece on the board parsed from FEN notation.
struct ChessBoardSquare: Identifiable, Sendable {
    let id: String
    let row: Int
    let col: Int
    let piece: Character?
}

/// A recorded chess move for the move history list.
struct ChessMove: Identifiable, Sendable {
    let id = UUID()
    let moveNumber: Int
    let whiteMove: String
    let blackMove: String?
}

/// ViewModel for the chess game screen.
/// Manages board state parsing from FEN and game actions.
/// WebSocket handling is in `ChessViewModel+WebSocket.swift`.
@MainActor
@Observable
final class ChessViewModel {
    var game: ChessGame?
    var board: [[Character?]] = Array(
        repeating: Array(repeating: nil, count: 8), count: 8
    )
    var currentTurn: PlayerColor = .white
    var gameStatus: ChessGameStatus = .waiting
    var moveHistory: [ChessMove] = []
    var capturedPieces: (white: [Character], black: [Character]) = ([], [])
    var isLoading = false
    var error: String?
    var drawOffered = false

    var selectedSquare: (row: Int, col: Int)?

    let repository: any ChessRepository
    let authTokenProvider: AuthTokenProvider
    var connection: WebSocketConnection?
    var receiveTask: Task<Void, Never>?
    let logger = BayitLogger(category: "Chess")

    init(repository: any ChessRepository, authTokenProvider: AuthTokenProvider) {
        self.repository = repository
        self.authTokenProvider = authTokenProvider
    }

    // MARK: - Public Actions

    @MainActor
    func loadGame(gameId: String) async {
        isLoading = true
        error = nil
        do {
            let fetched = try await repository.getGameState(gameId: gameId)
            applyGameState(fetched)
            logger.info("Game loaded", context: ["gameId": gameId])
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to load game", error: error)
        }
        isLoading = false
    }

    @MainActor
    func createGame(mode: String, botDifficulty: String?) async {
        isLoading = true
        error = nil
        do {
            let created = try await repository.createGame(
                mode: mode, botDifficulty: botDifficulty
            )
            applyGameState(created)
            await connectWebSocket(gameCode: created.gameCode)
            logger.info("Game created", context: ["gameCode": created.gameCode])
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to create game", error: error)
        }
        isLoading = false
    }

    @MainActor
    func sendMove(from: (Int, Int), to: (Int, Int)) async {
        let fromNotation = squareNotation(row: from.0, col: from.1)
        let toNotation = squareNotation(row: to.0, col: to.1)
        let payload = "{\"type\":\"move\",\"from\":\"\(fromNotation)\",\"to\":\"\(toNotation)\"}"
        await sendWSPayload(payload)
        selectedSquare = nil
    }

    @MainActor func resign() async {
        await sendWSPayload("{\"type\":\"resign\"}")
    }

    @MainActor func offerDraw() async {
        await sendWSPayload("{\"type\":\"draw_offer\"}")
        drawOffered = true
    }

    @MainActor func respondToDraw(accept: Bool) async {
        await sendWSPayload("{\"type\":\"draw_response\",\"accept\":\(accept)}")
        drawOffered = false
    }

    @MainActor
    func disconnect() async {
        receiveTask?.cancel()
        receiveTask = nil
        if let conn = connection { await conn.disconnect() }
        connection = nil
    }

    // MARK: - FEN Parsing

    @MainActor
    func applyGameState(_ game: ChessGame) {
        self.game = game
        self.currentTurn = game.currentTurn
        self.gameStatus = game.status
        parseFEN(game.boardFen)
    }

    @MainActor
    func parseFEN(_ fen: String) {
        let ranks = fen.split(separator: " ").first?.split(separator: "/") ?? []
        var newBoard: [[Character?]] = Array(
            repeating: Array(repeating: nil, count: 8), count: 8
        )
        for (rowIndex, rank) in ranks.prefix(8).enumerated() {
            var col = 0
            for char in rank {
                if char.isNumber, let skip = char.wholeNumberValue {
                    col += skip
                } else {
                    if col < 8 { newBoard[rowIndex][col] = char }
                    col += 1
                }
            }
        }
        board = newBoard
    }

    // MARK: - Helpers

    func squareNotation(row: Int, col: Int) -> String {
        let file = String(UnicodeScalar(97 + col)!)
        let rank = String(8 - row)
        return "\(file)\(rank)"
    }
}
