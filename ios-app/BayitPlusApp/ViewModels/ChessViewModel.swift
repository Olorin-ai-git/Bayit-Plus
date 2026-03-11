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
    var whiteTimeRemainingMs: Int?
    var blackTimeRemainingMs: Int?
    var chatMessages: [ChessChatMessage] = []
    var isChatExpanded = false
    var pendingWhatsAppMessage: String?
    private var countdownTask: Task<Void, Never>?

    var selectedSquare: (row: Int, col: Int)?
    var lastMove: (from: (row: Int, col: Int), to: (row: Int, col: Int))?
    var showingJoinSheet: Bool = false
    var joinCode: String = ""

    var localUserId: String?
    var webHost: String = ""

    let repository: any ChessRepository
    let authTokenProvider: AuthTokenProvider
    var connection: WebSocketConnection?
    var receiveTask: Task<Void, Never>?
    let logger = BayitLogger(category: "Chess")

    init(repository: any ChessRepository, authTokenProvider: AuthTokenProvider) {
        self.repository = repository
        self.authTokenProvider = authTokenProvider
    }

    @MainActor
    func disconnect() async {
        stopCountdown()
        receiveTask?.cancel()
        receiveTask = nil
        if let conn = connection { await conn.disconnect() }
        connection = nil
    }

    // MARK: - Countdown Timer

    func startCountdown() {
        stopCountdown()
        countdownTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 100_000_000)
                guard let self else { return }
                await self.tickCountdown()
            }
        }
    }

    func stopCountdown() {
        countdownTask?.cancel()
        countdownTask = nil
    }

    @MainActor
    private func tickCountdown() {
        if currentTurn == .white, let ms = whiteTimeRemainingMs {
            whiteTimeRemainingMs = max(0, ms - 100)
        } else if currentTurn == .black, let ms = blackTimeRemainingMs {
            blackTimeRemainingMs = max(0, ms - 100)
        }
    }

    // MARK: - FEN Parsing

    @MainActor
    func applyGameState(_ game: ChessGame) {
        self.game = game
        currentTurn = game.currentTurn
        gameStatus = game.status
        whiteTimeRemainingMs = game.whitePlayer?.timeRemainingMs
        blackTimeRemainingMs = game.blackPlayer?.timeRemainingMs
        parseFEN(game.boardFen)
        if game.timeControl != nil, game.status == .active {
            startCountdown()
        } else {
            stopCountdown()
        }
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

    // MARK: - Computed Properties

    var currentUserId: String? {
        localUserId
    }

    var myColor: PlayerColor? {
        guard let game, let localUserId else { return nil }
        if game.whitePlayer?.userId == localUserId { return .white }
        if game.blackPlayer?.userId == localUserId { return .black }
        return nil
    }

    var botChatLimitReached: Bool {
        chatMessages.contains { $0.isSystem }
    }

    // MARK: - Helpers

    func squareNotation(row: Int, col: Int) -> String {
        let file = String(UnicodeScalar(97 + col)!)
        let rank = String(8 - row)
        return "\(file)\(rank)"
    }
}
