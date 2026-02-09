import Foundation

// MARK: - Trivia Leaderboard

/// A single entry in the trivia leaderboard
struct LeaderboardEntry: Decodable, Sendable, Identifiable {
    let id: String
    let userId: String
    let displayName: String
    let avatarUrl: String?
    let rank: Int
    let rating: Double
    let gamesPlayed: Int
    let gamesWon: Int
    let winRate: Double
    let isCurrentUser: Bool?
}

/// Response from GET /api/v1/stats/leaderboard
struct LeaderboardResponse: Decodable, Sendable {
    let entries: [LeaderboardEntry]
    let totalPlayers: Int?
    let currentUserRank: Int?
}
