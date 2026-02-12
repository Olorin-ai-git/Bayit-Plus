import Foundation

// MARK: - Daily Missions

struct DailyMission: Decodable, Sendable, Identifiable {
    let id: String
    let type: String
    let title: String
    let description: String
    let iconName: String
    let targetValue: Int
    let currentValue: Int
    let rewardShekels: Int
    let isCompleted: Bool
    let isClaimed: Bool
    let expiresAt: Date
}

struct DailyMissionsResponse: Decodable, Sendable {
    let missions: [DailyMission]
    let totalAvailableShekels: Int
    let date: String
}

// MARK: - Shekels Wallet

struct ShekelsBalance: Decodable, Sendable {
    let balance: Int
    let totalEarned: Int
    let totalSpent: Int
}

struct ShekelsTransaction: Decodable, Sendable, Identifiable {
    let id: String
    let type: TransactionType
    let amount: Int
    let description: String
    let createdAt: Date

    enum TransactionType: String, Decodable {
        case earned
        case spent
        case bonus
        case penalty
    }
}

struct ShekelsWalletResponse: Decodable, Sendable {
    let balance: ShekelsBalance
    let recentTransactions: [ShekelsTransaction]
}

// MARK: - Leaderboard

struct LeaderboardUser: Decodable, Sendable, Identifiable {
    let id: String
    let userId: String
    let displayName: String
    let avatarUrl: String?
    let position: Int
    let points: Int
    let streakDays: Int
    let isCurrentUser: Bool
}

struct LeaderboardResponse: Decodable, Sendable {
    let users: [LeaderboardUser]
    let currentUserRank: LeaderboardUser?
    let scope: LeaderboardScope
    let period: LeaderboardPeriod
}

enum LeaderboardScope: String, CaseIterable, Sendable {
    case global
    case friends
    case family

    var displayName: String {
        switch self {
        case .global: return "Global"
        case .friends: return "Friends"
        case .family: return "Family"
        }
    }
}

enum LeaderboardPeriod: String, CaseIterable, Sendable {
    case daily
    case weekly
    case monthly
    case allTime = "all_time"

    var displayName: String {
        switch self {
        case .daily: return "Daily"
        case .weekly: return "Weekly"
        case .monthly: return "Monthly"
        case .allTime: return "All Time"
        }
    }
}

// MARK: - Mission Claim

struct ClaimMissionRequest: Encodable {
    let missionId: String
}

struct ClaimMissionResponse: Decodable {
    let success: Bool
    let newBalance: Int
    let earnedShekels: Int
}

// MARK: - Coupons

struct Coupon: Decodable, Sendable, Identifiable {
    let id: String
    let partnerId: String
    let partnerName: String
    let title: String
    let description: String
    let imageUrl: String?
    let costShekels: Int
    let category: String
    let expiresAt: Date?
    let remainingStock: Int?
}

struct CouponsResponse: Decodable, Sendable {
    let coupons: [Coupon]
}

struct RedeemCouponRequest: Encodable {
    let couponId: String
}

struct RedeemCouponResponse: Decodable, Sendable {
    let success: Bool
    let redemptionCode: String
    let newBalance: Int
}

// MARK: - Weekly Zine

struct WeeklyZine: Decodable, Sendable, Identifiable {
    let id: String
    let weekStartDate: String
    let title: String
    let coverImageUrl: String?
    let pages: [ZinePage]
    let isViewed: Bool
}

struct ZinePage: Decodable, Sendable, Identifiable {
    let id: String
    let pageNumber: Int
    let imageUrl: String
    let caption: String?
}

struct ZineListResponse: Decodable, Sendable {
    let current: WeeklyZine?
    let archive: [WeeklyZine]
}
