import Foundation

// MARK: - Flexible Rating

/// Decodes a rating value that may arrive as a number (7.654) or string ("PG-13") from the API.
struct FlexibleRating: Decodable, Sendable {
    let value: String

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let doubleValue = try? container.decode(Double.self) {
            value = String(format: "%.1f", doubleValue)
        } else if let stringValue = try? container.decode(String.self) {
            value = stringValue
        } else {
            value = ""
        }
    }
}

// MARK: - Featured / Home

/// Response from GET /api/v1/content/featured
struct FeaturedResponse: Decodable, Sendable {
    let hero: HeroContent?
    let spotlight: [SpotlightItem]
    let categories: [ContentCategory]
}

/// Hero content displayed at the top of the home screen
struct HeroContent: Decodable, Sendable, Identifiable {
    let id: String?
    let title: String?
    let description: String?
    let backdrop: String?
    let thumbnail: String?
    let category: String?
    let year: Int?
    let duration: String?
    let rating: FlexibleRating?
}

/// Spotlight carousel item
struct SpotlightItem: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let description: String?
    let backdrop: String?
    let thumbnail: String?
    let category: String?
    let year: Int?
    let duration: String?
    let rating: FlexibleRating?
    let isSeries: Bool?
    let totalEpisodes: Int?
    let availableSubtitleLanguages: [String]?
    let hasSubtitles: Bool?
}

/// A content category row (movies, series, podcasts, etc.)
struct ContentCategory: Decodable, Sendable, Identifiable {
    let id: String
    let name: String
    let nameKey: String?
    let nameEn: String?
    let nameEs: String?
    let items: [ContentItem]
}

/// A content item within a category row or search results
struct ContentItem: Decodable, Sendable, Identifiable, Hashable {
    let id: String
    let title: String?
    let thumbnail: String?
    let duration: String?
    let year: Int?
    let category: String?
    let categoryNameEn: String?
    let categoryNameEs: String?
    let type: String?
    let isSeries: Bool?
    let totalEpisodes: Int?
    let availableSubtitleLanguages: [String]?
    let hasSubtitles: Bool?
    let author: String?
    let narrator: String?

    static func == (lhs: ContentItem, rhs: ContentItem) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

// MARK: - Content Discovery

/// Response from GET /api/v1/content/all
struct ContentListResponse: Decodable, Sendable {
    let items: [ContentItem]
    let total: Int
    let page: Int
    let limit: Int
}

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
    let isSeries: Bool?
    let type: String?
    let availableSubtitleLanguages: [String]?
    let hasSubtitles: Bool?
    let related: [RelatedItem]?
    let streamUrl: String?
    let directUrl: String?
    let streamType: String?
    let previewUrl: String?
    let trailerUrl: String?
    let isTranscoded: Bool?
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

// MARK: - Search

/// Response from POST /api/v1/content/search
struct SearchResponse: Decodable, Sendable {
    let query: String
    let results: [SearchResult]
    let total: Int
}

/// A search result item
struct SearchResult: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let thumbnail: String?
    let duration: String?
    let year: Int?
    let category: String?
    let type: String?
    let availableSubtitleLanguages: [String]?
    let hasSubtitles: Bool?
}

/// Search request body
struct SearchRequest: Encodable, Sendable {
    let query: String
    let type: String?
    let page: Int?
    let limit: Int?
}
