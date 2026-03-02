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
/// Note: No CodingKeys needed — APIClient's `.convertFromSnakeCase` handles
/// the snake_case -> camelCase mapping automatically.
struct ChessPlayer: Codable, Sendable, Identifiable {
    var id: String {
        userId
    }

    let userId: String
    let userName: String
    let color: PlayerColor
    let isConnected: Bool
    let isBot: Bool
    let timeRemainingMs: Int?
    let joinedAt: Date
}

/// A chess game session.
/// Maps to backend `ChessGame` document model response shape.
/// Note: No CodingKeys needed — APIClient's `.convertFromSnakeCase` handles
/// the snake_case -> camelCase mapping automatically.
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
    let invitedUserId: String?
    let inviteStatus: String?
}
