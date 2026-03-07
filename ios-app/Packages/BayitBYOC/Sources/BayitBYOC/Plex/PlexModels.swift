import Foundation

/// Plex PIN used for device authentication on tvOS.
public struct PlexPIN: Sendable {
    public let id: Int
    public let code: String
    public let authToken: String?
    public let expiresAt: Date

    public var isExpired: Bool {
        Date() >= expiresAt
    }
}

/// A Plex media server discovered via the user's account.
public struct PlexServer: Identifiable, Sendable, Hashable {
    public let id: String
    public let name: String
    public let host: String
    public let port: Int
    public let isLocal: Bool
    public let isOwned: Bool

    public var baseURL: String {
        "http\(isLocal ? "" : "s")://\(host):\(port)"
    }

    public func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    public static func == (lhs: PlexServer, rhs: PlexServer) -> Bool {
        lhs.id == rhs.id
    }
}

/// A library section on a Plex server (Movies, TV Shows, etc.).
public struct PlexLibrary: Identifiable, Sendable {
    public let id: String
    public let title: String
    public let type: PlexLibraryType
    public let itemCount: Int
}

/// Supported Plex library types.
public enum PlexLibraryType: String, Sendable {
    case movie
    case show
    case artist
    case photo
    case unknown

    init(rawType: String) {
        switch rawType {
        case "movie": self = .movie
        case "show": self = .show
        case "artist": self = .artist
        case "photo": self = .photo
        default: self = .unknown
        }
    }
}

/// A media item from a Plex library.
public struct PlexMediaItem: Identifiable, Sendable {
    public let id: String
    public let title: String
    public let summary: String?
    public let year: Int?
    public let duration: Int?
    public let thumbPath: String?
    public let artPath: String?
    public let genre: String?
    public let contentType: PlexLibraryType
    public let streamPath: String?
}
