import Foundation

// MARK: - Content Detail

/// Response from GET /api/v1/content/{content_id}
struct ContentDetail: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let description: String?
    let thumbnail: String?
    let backdrop: String?
    let category: String?
    let duration: String?
    let year: Int?
    let rating: FlexibleRating?
    let genre: String?
    let cast: [String]?
    let director: String?
    let type: String?
    let availableSubtitleLanguages: [String]?
    let hasSubtitles: Bool?
    let related: [RelatedItem]?
    let streamUrl: String?
    let directUrl: String?
    let streamType: String?
    let previewUrl: String?
    let trailerUrl: String?
    let trailerStreamUrl: String?
    let isTranscoded: Bool?
}

/// Response from the trailer stream resolution endpoint
struct TrailerStreamResponse: Decodable, Sendable {
    let streamUrl: String?
}

/// Related content item shown on detail pages
struct RelatedItem: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let thumbnail: String?
    let duration: String?
    let year: Int?
    let type: String?
}

// MARK: - Content Discovery

/// Response from GET /api/v1/content/all
struct ContentListResponse: Decodable, Sendable {
    let items: [ContentItem]
    let total: Int
    let page: Int
    let limit: Int
}
