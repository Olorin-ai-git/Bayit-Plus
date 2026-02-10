import Foundation

// MARK: - Unified Search Response

/// Response from GET /api/v1/search/unified
struct UnifiedSearchResponse: Decodable, Sendable {
    let results: [UnifiedSearchResult]
    let total: Int
    let page: Int
    let pageSize: Int
    let hasMore: Bool
}

/// A single result from the unified search API
struct UnifiedSearchResult: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let description: String?
    let thumbnail: String?
    let backdrop: String?
    let categoryName: String?
    let duration: String?
    let year: Int?
    let rating: FlexibleRating?
    let genres: [String]?
    let contentType: String?
    let isSeries: Bool?
    let requiresSubscription: String?
    let isKidsContent: Bool?
    let availableSubtitleLanguages: [String]?
    let hasSubtitles: Bool?
    let isFeatured: Bool?
    let author: String?
    let narrator: String?
}

// MARK: - Content Type Filter

/// Filter options for unified search, matching web search filter pills
enum SearchContentTypeFilter: CaseIterable, Sendable {
    case all
    case vod
    case live
    case podcasts

    var displayLabel: String {
        switch self {
        case .all: return "All"
        case .vod: return "Movies"
        case .live: return "Channels"
        case .podcasts: return "Podcasts"
        }
    }

    /// Content type strings sent to the API `content_types` query param
    var apiContentTypes: [String] {
        switch self {
        // TEMPORARILY HIDDEN: "vod" removed from all-filter per product request
        case .all: return ["live", "radio", "podcast"]
        case .vod: return ["vod"]
        case .live: return ["live"]
        case .podcasts: return ["podcast"]
        }
    }
}

// MARK: - Trending Searches Response

/// Response from GET /api/v1/search/trending
struct TrendingSearchesResponse: Decodable, Sendable {
    let trending: [String]
}
