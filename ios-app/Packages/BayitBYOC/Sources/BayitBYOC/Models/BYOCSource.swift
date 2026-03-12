import Foundation

/// Type of external content source.
public enum BYOCSourceType: String, Codable, Sendable {
    case iptv
    case xtream
    case plex
    case youtube
}

/// Status of a BYOC source.
public enum BYOCSourceStatus: String, Codable, Sendable {
    case active
    case error
    case authExpired
}

/// Configuration for a single BYOC content source.
public struct BYOCSourceConfig: Codable, Identifiable, Sendable {
    public let id: String
    public let type: BYOCSourceType
    public let name: String
    public let url: URL?
    public let addedAt: Date
    public var lastRefreshedAt: Date?
    public var accountExpiry: Date?
    public var status: BYOCSourceStatus

    public init(
        id: String = UUID().uuidString,
        type: BYOCSourceType,
        name: String,
        url: URL? = nil,
        addedAt: Date = Date(),
        lastRefreshedAt: Date? = nil,
        accountExpiry: Date? = nil,
        status: BYOCSourceStatus = .active
    ) {
        self.id = id
        self.type = type
        self.name = name
        self.url = url
        self.addedAt = addedAt
        self.lastRefreshedAt = lastRefreshedAt
        self.accountExpiry = accountExpiry
        self.status = status
    }
}
