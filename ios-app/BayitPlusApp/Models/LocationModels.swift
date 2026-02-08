import Foundation

// MARK: - Location-Based Content

/// Response from GET /api/v1/content/israelis-in-city
struct IsraelisInCityResponse: Decodable, Sendable {
    let location: LocationInfo?
    let content: LocationContent?
    let coverage: Coverage?
    let totalItems: Int?
}

/// Response from GET /api/v1/content/israeli-businesses-in-city
struct IsraeliBusinessesResponse: Decodable, Sendable {
    let location: LocationInfo?
    let content: BusinessContent?
    let coverage: Coverage?
    let totalItems: Int?
}

/// Location information
struct LocationInfo: Decodable, Sendable {
    let city: String?
    let state: String?
    let latitude: Double?
    let longitude: Double?
    let source: String?  // 'geolocation' | 'cache' | 'timezone_inferred'
}

/// Location-based content (israelis in city)
struct LocationContent: Decodable, Sendable {
    let newsArticles: [LocationItem]?
    let communityEvents: [LocationItem]?
}

/// Business content
struct BusinessContent: Decodable, Sendable {
    let newsArticles: [LocationItem]?  // Actually business listings
}

/// Coverage information
struct Coverage: Decodable, Sendable {
    let hasContent: Bool?
    let contentSource: String?  // 'local' | 'nearby'
    let nearestMajorCity: String?
    let distanceMiles: Double?
}

/// A location-based content item (article, event, business)
struct LocationItem: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let description: String?
    let url: String?
    let imageUrl: String?
    let sourceName: String?
    let publishedAt: String?
    let category: String?
    let city: String?
    let state: String?
}

// MARK: - City-Specific Content

/// Response from GET /api/v1/tel-aviv/content or /api/v1/jerusalem/content
struct CityContentResponse: Decodable, Sendable {
    let items: [CityContentItem]
    let total: Int?
    let city: String?
}

/// A city-specific content item
struct CityContentItem: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let description: String?
    let url: String?
    let imageUrl: String?
    let sourceName: String?
    let publishedAt: String?
    let category: String?
}

// MARK: - Trending Content

/// Response from GET /api/v1/cultures/{culture_id}/trending
struct TrendingResponse: Decodable, Sendable {
    let items: [TrendingItem]
    let total: Int?
    let cultureId: String?
}

/// A trending content item
struct TrendingItem: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let thumbnail: String?
    let duration: String?
    let year: Int?
    let category: String?
    let type: String?
    let isSeries: Bool?
    let totalEpisodes: Int?
}

// MARK: - Continue Watching

/// Response from GET /api/v1/history/continue
struct ContinueWatchingResponse: Decodable, Sendable {
    let items: [ContinueWatchingItem]
    let total: Int?
}

/// A continue watching item with progress
struct ContinueWatchingItem: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let thumbnail: String?
    let type: String?
    let duration: String?
    let year: Int?
    let category: String?
    let progress: Double?  // 0-100
    let isSeries: Bool?
    let totalEpisodes: Int?
}
