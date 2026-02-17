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
    case movies
    case series
    case collections
    case live
    case radio
    case podcasts
    case kids

    var localizationKey: String {
        switch self {
        case .all: return "search.filters.all"
        case .movies: return "vod.movies"
        case .series: return "vod.series"
        case .collections: return "vod.collectionsOnly"
        case .live: return "search.filters.channels"
        case .radio: return "search.filters.radio"
        case .podcasts: return "search.filters.podcasts"
        case .kids: return "vod.categories.kids"
        }
    }

    /// Content type strings sent to the API `content_types` query param
    var apiContentTypes: [String] {
        switch self {
        case .all: return ["live", "radio", "podcast", "vod"]
        case .movies: return ["vod"]
        case .series: return ["vod"]
        case .collections: return ["vod"]
        case .live: return ["live"]
        case .radio: return ["radio"]
        case .podcasts: return ["podcast"]
        case .kids: return ["vod", "live", "podcast"]
        }
    }
}

// MARK: - Trending Searches Response

/// Response from GET /api/v1/search/trending
struct TrendingSearchesResponse: Decodable, Sendable {
    let trending: [String]
}

// MARK: - Search Suggestions Response

/// Response from GET /api/v1/search/suggestions
struct SearchSuggestionsResponse: Decodable, Sendable {
    let suggestions: [String]
}
