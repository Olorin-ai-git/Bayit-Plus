import Foundation

/// Account information from Xtream Codes authentication.
public struct XtreamAccountInfo: Sendable {
    public let username: String
    public let status: String
    public let expirationDate: Date?
    public let maxConnections: Int
    public let activeConnections: Int
    public let serverURL: String

    public var isActive: Bool {
        status.lowercased() == "active"
    }

    public var isExpiringSoon: Bool {
        guard let exp = expirationDate else { return false }
        return exp.timeIntervalSinceNow < 7 * 24 * 3600
    }
}

/// A content category from Xtream Codes.
public struct XtreamCategory: Sendable {
    public let categoryId: String
    public let categoryName: String
}

/// A live stream entry from Xtream Codes.
public struct XtreamLiveStream: Sendable {
    public let streamId: Int
    public let name: String
    public let streamIcon: String?
    public let epgChannelId: String?
    public let categoryId: String
    public let customSid: String?
}

/// A VOD movie from Xtream Codes.
public struct XtreamVODItem: Sendable {
    public let streamId: Int
    public let name: String
    public let streamIcon: String?
    public let rating: String?
    public let year: String?
    public let categoryId: String
    public let containerExtension: String
}

/// A series entry from Xtream Codes.
public struct XtreamSeries: Sendable {
    public let seriesId: Int
    public let name: String
    public let cover: String?
    public let plot: String?
    public let year: String?
    public let genre: String?
    public let categoryId: String
}

/// A season within a series.
public struct XtreamSeason: Sendable {
    public let seasonNumber: Int
    public let episodes: [XtreamEpisode]
}

/// An episode within a series season.
public struct XtreamEpisode: Sendable {
    public let id: String
    public let episodeNumber: Int
    public let title: String
    public let containerExtension: String
    public let duration: String?
}

/// Xtream Codes API errors.
public enum XtreamError: Error, Sendable {
    case invalidCredentials
    case accountExpired
    case networkError(Error)
    case invalidResponse
    case httpError(statusCode: Int)
}

extension XtreamError: LocalizedError {
    public var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            return "Invalid Xtream Codes credentials"
        case .accountExpired:
            return "Xtream Codes account has expired"
        case .networkError:
            return "Network error. Check your connection"
        case .invalidResponse:
            return "Invalid response from server"
        case let .httpError(statusCode):
            return "Server returned status \(statusCode)"
        }
    }
}
