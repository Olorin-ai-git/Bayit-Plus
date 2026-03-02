import Foundation

/// Legacy alias kept for backward compatibility with ContentRepository.searchContent().
typealias SearchResponse = UnifiedSearchResponse

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
    case actors
    case live
    case radio
    case podcasts
    case audiobooks
    case kids

    var localizationKey: String {
        switch self {
        case .all: return "search.filters.all"
        case .movies: return "vod.movies"
        case .series: return "vod.series"
        case .collections: return "vod.collectionsOnly"
        case .actors: return "search.filters.actors"
        case .live: return "search.filters.channels"
        case .radio: return "search.filters.radio"
        case .podcasts: return "search.filters.podcasts"
        case .audiobooks: return "audiobooks.title"
        case .kids: return "vod.categories.kids"
        }
    }

    /// Content type strings sent to the API `content_types` query param
    var apiContentTypes: [String] {
        switch self {
        case .all: return ["live", "radio", "podcast", "vod", "audiobook", "actor"]
        case .movies: return ["movie"]
        case .series: return ["series"]
        case .collections: return ["collection"]
        case .actors: return ["actor"]
        case .live: return ["live"]
        case .radio: return ["radio"]
        case .podcasts: return ["podcast"]
        case .audiobooks: return ["audiobook"]
        case .kids: return ["vod", "live", "podcast"]
        }
    }

    /// Client-side filtering only needed for cross-type filters like kids.
    /// All other filtering is handled server-side via content_types param.
    func applyClientFilter(_ results: [UnifiedSearchResult]) -> [UnifiedSearchResult] {
        switch self {
        case .kids: return results.filter { $0.isKidsContent == true }
        default: return results
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

// MARK: - Search History

/// Response from GET /api/v1/search/history
struct SearchHistoryResponse: Decodable, Sendable {
    let history: [String]
}

/// Request body for POST /api/v1/search/history
struct SaveSearchHistoryRequest: Encodable, Sendable {
    let query: String
}

/// Generic success response for endpoints returning {"success": true}
struct EmptySuccessResponse: Decodable, Sendable {
    let success: Bool?
    let removed: Int?
}

// MARK: - Search Sort Option

enum SearchSortOption: String, CaseIterable, Sendable {
    case relevance
    case newest
    case oldest
    case titleAsc = "title_asc"
    case titleDesc = "title_desc"
    case popularity

    var localizationKey: String {
        switch self {
        case .relevance: return "search.sort.relevance"
        case .newest: return "search.sort.newest"
        case .oldest: return "search.sort.oldest"
        case .titleAsc: return "search.sort.titleAsc"
        case .titleDesc: return "search.sort.titleDesc"
        case .popularity: return "search.sort.popularity"
        }
    }

    var iconName: String {
        switch self {
        case .relevance: return "star"
        case .newest: return "calendar.badge.clock"
        case .oldest: return "calendar"
        case .titleAsc: return "textformat.abc"
        case .titleDesc: return "textformat.abc"
        case .popularity: return "flame"
        }
    }

    var apiSortBy: String {
        switch self {
        case .relevance: return "relevance"
        case .newest, .oldest: return "date"
        case .titleAsc, .titleDesc: return "title"
        case .popularity: return "popularity"
        }
    }

    var apiSortOrder: String {
        switch self {
        case .relevance, .newest, .popularity, .titleDesc: return "desc"
        case .oldest, .titleAsc: return "asc"
        }
    }
}
