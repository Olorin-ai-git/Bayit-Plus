import Foundation

/// Content item from an external source (Plex or YouTube).
public struct BYOCContentItem: Identifiable, Hashable, Sendable {
    public let id: String
    public let title: String
    public let description: String?
    public let thumbnailURL: URL?
    public let backdropURL: URL?
    public let duration: Int?
    public let year: Int?
    public let genre: String?
    public let sourceType: BYOCSourceType
    public let sourceId: String
    public let streamURL: URL?
    public let contentType: BYOCContentType

    public init(
        id: String,
        title: String,
        description: String? = nil,
        thumbnailURL: URL? = nil,
        backdropURL: URL? = nil,
        duration: Int? = nil,
        year: Int? = nil,
        genre: String? = nil,
        sourceType: BYOCSourceType,
        sourceId: String,
        streamURL: URL? = nil,
        contentType: BYOCContentType = .movie
    ) {
        self.id = id
        self.title = title
        self.description = description
        self.thumbnailURL = thumbnailURL
        self.backdropURL = backdropURL
        self.duration = duration
        self.year = year
        self.genre = genre
        self.sourceType = sourceType
        self.sourceId = sourceId
        self.streamURL = streamURL
        self.contentType = contentType
    }

    public func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    public static func == (lhs: BYOCContentItem, rhs: BYOCContentItem) -> Bool {
        lhs.id == rhs.id
    }
}

/// Content type for BYOC items.
public enum BYOCContentType: String, Codable, Sendable {
    case movie
    case series
    case episode
    case video
    case liveChannel
}
