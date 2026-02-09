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
