import Foundation

// MARK: - Trending Topics & Headlines
// Note: CultureTrendingItem is defined in LocationModels.swift.

/// A trending topic with relevance scoring.
struct TrendingTopic: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let category: String?
    let score: Double?
}

/// A trending headline from Israeli news sources.
struct TrendingHeadline: Decodable, Sendable, Identifiable {
    let id: String?
    let title: String?
    let source: String?
    let url: String?
    let timestamp: String?

    var stableId: String { id ?? title ?? UUID().uuidString }
}

// MARK: - VOD Trending Recommendations

/// A content item recommended based on trending topics in Israel.
struct TrendingContentRecommendation: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let description: String?
    let thumbnail: String?
    let type: String?
    let trendingTopic: String?
    let relevanceScore: Double?

    enum CodingKeys: String, CodingKey {
        case id, title, description, thumbnail, type
        case trendingTopic = "trending_topic"
        case relevanceScore = "relevance_score"
    }
}

/// Response from GET /api/v1/trending/recommendations
struct TrendingRecommendationsResponse: Decodable, Sendable {
    let recommendations: [TrendingContentRecommendation]
    let trendingTopics: [TrendingTopicSummary]?
    let analyzedAt: String?

    enum CodingKeys: String, CodingKey {
        case recommendations
        case trendingTopics = "trending_topics"
        case analyzedAt = "analyzed_at"
    }
}

/// Summary of a trending topic returned alongside recommendations.
struct TrendingTopicSummary: Decodable, Sendable {
    let title: String
    let category: String?
}
