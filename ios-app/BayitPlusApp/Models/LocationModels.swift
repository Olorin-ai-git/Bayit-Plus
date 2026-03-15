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
    let source: String? // 'geolocation' | 'cache' | 'timezone_inferred'
}

/// Location-based content (israelis in city)
struct LocationContent: Decodable, Sendable {
    let newsArticles: [LocationItem]?
    let communityEvents: [LocationItem]?
}

/// Business content
struct BusinessContent: Decodable, Sendable {
    let newsArticles: [LocationItem]? // Actually business listings
}

/// Coverage information
struct Coverage: Decodable, Sendable {
    let hasContent: Bool?
    let contentSource: String? // 'local' | 'nearby'
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
    let titleHe: String?
    let titleEn: String?
    let description: String?
    let descriptionHe: String?
    let descriptionEn: String?
    let url: String?
    let imageUrl: String?
    let sourceName: String?
    let publishedAt: String?
    let category: String?
}

// MARK: - Trending Content (Culture News Topics)

/// A culture content item from GET /api/v1/cultures/{culture_id}/trending
/// The API returns a raw JSON array of these items (not wrapped in an object).
struct CultureTrendingItem: Decodable, Sendable, Identifiable, Equatable {
    let id: String
    let cultureId: String?
    let cityId: String?
    let sourceId: String?
    let sourceName: String?
    let title: String
    let titleNative: String?
    let titleLocalized: [String: String]?
    let url: String?
    let publishedAt: String?
    let summary: String?
    let summaryNative: String?
    let summaryLocalized: [String: String]?
    let imageUrl: String?
    let category: String
    let categoryLabel: [String: String]?
    let tags: [String]?
    let relevanceScore: Double?
}

// MARK: - Continue Watching

// Note: ContinueWatchingResponse and WatchHistoryItem are defined in MediaModels.swift
