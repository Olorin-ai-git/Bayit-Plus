import Foundation

/// Subscription plan tiers matching the backend freemium model.
///
/// Maps to: non_registered, free, plus
public enum SubscriptionTier: String, Codable, Sendable, CaseIterable {
    case nonRegistered = "non_registered"
    case free
    case plus

    /// Whether this tier grants Plus-level features (AI, downloads, 4K).
    public var isPremium: Bool {
        switch self {
        case .plus:
            return true
        case .nonRegistered, .free:
            return false
        }
    }

    /// Whether this tier is a paid subscription.
    public var isPaid: Bool {
        switch self {
        case .plus:
            return true
        case .nonRegistered, .free:
            return false
        }
    }
}

/// Subscription status values from the backend.
public enum SubscriptionStatus: String, Codable, Sendable {
    case active
    case canceled
    case cancelled
    case expired
    case trial
    case paused
}

/// User subscription details matching the backend Subscription model.
public struct UserSubscription: Codable, Sendable {
    public let plan: SubscriptionTier
    public let status: SubscriptionStatus
    public let startDate: String?
    public let endDate: String?
    public let autoRenew: Bool?

    private enum CodingKeys: String, CodingKey {
        case plan
        case status
        case startDate = "start_date"
        case endDate = "end_date"
        case autoRenew = "auto_renew"
    }
}
