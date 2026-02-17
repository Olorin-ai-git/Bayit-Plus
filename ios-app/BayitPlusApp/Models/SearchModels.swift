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

    /// Applies client-side filtering for content type sub-categories the API cannot distinguish.
    func applyClientFilter(_ results: [UnifiedSearchResult]) -> [UnifiedSearchResult] {
        switch self {
        case .movies:
            return results.filter { r in
                let ct = r.contentType?.lowercased() ?? ""
                return (ct == "vod" || ct == "movie") && r.isSeries != true && !ct.contains("collection")
            }
        case .series: return results.filter { $0.isSeries == true }
        case .collections: return results.filter { ($0.contentType?.lowercased() ?? "").contains("collection") }
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

// MARK: - Search Advanced Filters

struct SearchAdvancedFilters: Sendable, Equatable {
    var language: String?
    var yearFrom: Int?
    var yearTo: Int?
    var durationMin: Int?
    var durationMax: Int?
    var hasSubtitles: Bool?
    var hasDubbing: Bool?

    var activeCount: Int {
        var count = 0
        if language != nil { count += 1 }
        if yearFrom != nil || yearTo != nil { count += 1 }
        if durationMin != nil || durationMax != nil { count += 1 }
        if hasSubtitles == true { count += 1 }
        if hasDubbing == true { count += 1 }
        return count
    }

    var isEmpty: Bool { activeCount == 0 }

    mutating func reset() {
        language = nil
        yearFrom = nil
        yearTo = nil
        durationMin = nil
        durationMax = nil
        hasSubtitles = nil
        hasDubbing = nil
    }
}
