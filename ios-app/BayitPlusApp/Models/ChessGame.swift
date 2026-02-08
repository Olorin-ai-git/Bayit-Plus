import Foundation

/// Chess player color, matching backend `PlayerColor` enum.
enum PlayerColor: String, Codable, Sendable {
    case white
    case black
}

/// Chess game mode, matching backend `GameMode` enum.
enum ChessGameMode: String, Codable, Sendable {
    case pvp
    case bot
}

/// Bot difficulty level, matching backend `BotDifficulty` enum.
enum BotDifficulty: String, Codable, Sendable {
    case easy
    case medium
    case hard
}

/// Chess game status, matching backend `GameStatus` enum.
enum ChessGameStatus: String, Codable, Sendable {
    case waiting
    case active
    case checkmate
    case stalemate
    case draw
    case resigned
    case timeout
}

/// Player information within a chess game.
/// Maps to backend `ChessPlayer` pydantic model.
struct ChessPlayer: Codable, Sendable, Identifiable {
    var id: String { userId }
    let userId: String
    let userName: String
    let color: PlayerColor
    let isConnected: Bool
    let isBot: Bool
    let timeRemainingMs: Int?
    let joinedAt: Date

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case userName = "user_name"
        case color
        case isConnected = "is_connected"
        case isBot = "is_bot"
        case timeRemainingMs = "time_remaining_ms"
        case joinedAt = "joined_at"
    }
}

/// A chess game session.
/// Maps to backend `ChessGame` document model response shape.
struct ChessGame: Codable, Identifiable, Sendable {
    let id: String
    let gameCode: String
    let whitePlayer: ChessPlayer?
    let blackPlayer: ChessPlayer?
    let currentTurn: PlayerColor
    let status: ChessGameStatus
    let boardFen: String
    let chatEnabled: Bool
    let voiceEnabled: Bool
    let timeControl: Int?
    let gameMode: ChessGameMode
    let botDifficulty: BotDifficulty?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case gameCode = "game_code"
        case whitePlayer = "white_player"
        case blackPlayer = "black_player"
        case currentTurn = "current_turn"
        case status
        case boardFen = "board_fen"
        case chatEnabled = "chat_enabled"
        case voiceEnabled = "voice_enabled"
        case timeControl = "time_control"
        case gameMode = "game_mode"
        case botDifficulty = "bot_difficulty"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
