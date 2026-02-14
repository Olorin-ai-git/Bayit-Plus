import Foundation

/// Authentication provider type for account linking
public enum AuthProviderType: String, Codable, Sendable, CaseIterable {
    case google = "google"
    case apple = "apple"
    case local = "local"

    /// Human-readable display name for the provider
    public var displayName: String {
        switch self {
        case .google: return "Google"
        case .apple: return "Apple"
        case .local: return "Email"
        }
    }

    /// System icon name for the provider
    public var iconName: String {
        switch self {
        case .google: return "g.circle.fill"
        case .apple: return "apple.logo"
        case .local: return "envelope.fill"
        }
    }

    /// Firebase provider ID for linking/unlinking operations
    public var firebaseProviderID: String {
        switch self {
        case .google: return "google.com"
        case .apple: return "apple.com"
        case .local: return "password"
        }
    }
}

/// Represents a linked authentication provider for the current user
public struct LinkedProvider: Codable, Identifiable, Hashable, Sendable {
    public let id: String
    public let provider: AuthProviderType
    public let isPrimary: Bool
    public let linkedAt: String
    public let providerEmail: String?

    enum CodingKeys: String, CodingKey {
        case provider
        case isPrimary = "is_primary"
        case linkedAt = "linked_at"
        case providerEmail = "provider_email"
    }

    public init(
        id: String,
        provider: AuthProviderType,
        isPrimary: Bool,
        linkedAt: String,
        providerEmail: String?
    ) {
        self.id = id
        self.provider = provider
        self.isPrimary = isPrimary
        self.linkedAt = linkedAt
        self.providerEmail = providerEmail
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let providerString = try container.decode(String.self, forKey: .provider)

        guard let providerType = AuthProviderType(rawValue: providerString) else {
            throw DecodingError.dataCorruptedError(
                forKey: .provider,
                in: container,
                debugDescription: "Invalid provider type: \(providerString)"
            )
        }

        self.id = providerString
        self.provider = providerType
        self.isPrimary = try container.decode(Bool.self, forKey: .isPrimary)
        self.linkedAt = try container.decode(String.self, forKey: .linkedAt)
        self.providerEmail = try container.decodeIfPresent(String.self, forKey: .providerEmail)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(provider, forKey: .provider)
        try container.encode(isPrimary, forKey: .isPrimary)
        try container.encode(linkedAt, forKey: .linkedAt)
        try container.encodeIfPresent(providerEmail, forKey: .providerEmail)
    }
}
