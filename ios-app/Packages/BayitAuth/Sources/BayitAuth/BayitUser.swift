import Foundation

/// Authenticated user model matching the backend User response.
///
/// Maps to the shared `User` interface from `shared/types/rbac.ts`:
/// - id, email, name, avatar, is_active, role, permissions, subscription
public struct BayitUser: Codable, Sendable, Identifiable {
    public let id: String
    public let email: String
    public let displayName: String?
    public let photoURL: URL?
    public let role: UserRole
    public let isActive: Bool
    public let subscription: UserSubscription?
    public let isBetaUser: Bool
    public let isVerified: Bool
    public let createdAt: String?
    public let lastLogin: String?

    private enum CodingKeys: String, CodingKey {
        case id
        case email
        case displayName = "name"
        case photoURL = "avatar"
        case role
        case isActive = "is_active"
        case subscription
        case isBetaUser = "is_beta_user"
        case isVerified = "is_verified"
        case createdAt = "created_at"
        case lastLogin = "last_login"
    }

    public init(
        id: String,
        email: String,
        displayName: String?,
        photoURL: URL?,
        role: UserRole,
        isActive: Bool,
        subscription: UserSubscription?,
        isBetaUser: Bool,
        isVerified: Bool,
        createdAt: String?,
        lastLogin: String?
    ) {
        self.id = id
        self.email = email
        self.displayName = displayName
        self.photoURL = photoURL
        self.role = role
        self.isActive = isActive
        self.subscription = subscription
        self.isBetaUser = isBetaUser
        self.isVerified = isVerified
        self.createdAt = createdAt
        self.lastLogin = lastLogin
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        email = try container.decode(String.self, forKey: .email)
        displayName = try container.decodeIfPresent(String.self, forKey: .displayName)
        photoURL = try container.decodeIfPresent(URL.self, forKey: .photoURL)
        role = (try? container.decode(UserRole.self, forKey: .role)) ?? .user
        isActive = try container.decodeIfPresent(Bool.self, forKey: .isActive) ?? true
        subscription = try? container.decodeIfPresent(
            UserSubscription.self, forKey: .subscription
        )
        isBetaUser = try container.decodeIfPresent(Bool.self, forKey: .isBetaUser) ?? false
        isVerified = try container.decodeIfPresent(Bool.self, forKey: .isVerified) ?? false
        createdAt = try container.decodeIfPresent(String.self, forKey: .createdAt)
        lastLogin = try container.decodeIfPresent(String.self, forKey: .lastLogin)
    }

    /// Subscription tier derived from the subscription, defaulting to registered free.
    public var subscriptionTier: SubscriptionTier {
        subscription?.plan ?? .free
    }

    /// Whether the user can watch VOD content.
    public var canWatchVOD: Bool {
        if role.isAdmin { return true }
        return isVerified && subscription != nil
    }

    /// Whether the user has premium access.
    public var isPremium: Bool {
        if role.isAdmin { return true }
        return isVerified && subscriptionTier.isPremium
    }
}
