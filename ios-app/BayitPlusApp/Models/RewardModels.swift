import Foundation

// MARK: - Gamification / Rewards

/// Current reward balance with level and streak info.
struct RewardBalance: Decodable, Sendable {
    let points: Int?
    let level: Int?
    let badges: [Badge]?
    let streakDays: Int?
}

/// A badge earned through gamification activities.
struct Badge: Decodable, Sendable, Identifiable {
    let id: String
    let name: String?
    let icon: String?
    let description: String?
    let earnedAt: String?
}
