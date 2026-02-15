import Foundation

// MARK: - Culture Content

/// A culture content item from aggregated Israeli sources.
struct CultureItem: Decodable, Sendable, Identifiable {
    let id: String
    let sourceName: String?
    let title: String?
    let titleHe: String?
    let titleEn: String?
    let description: String?
    let imageUrl: String?
    let contentUrl: String?
    let url: String?
    let category: String?
    let tags: [String]?
    let relevanceScore: Double?
}

/// Response from GET /api/v1/cultures/{culture_id}/content
struct CultureContentResponse: Decodable, Sendable {
    let items: [CultureItem]
    let sourcesCount: Int?
    let lastUpdated: String?
}

/// A culture category for filtering content.
struct CultureCategory: Decodable, Sendable, Identifiable {
    let id: String
    let name: String?
    let nameHe: String?
    let icon: String?
    let color: String?
}

/// Current time information for Israel.
struct CultureTime: Decodable, Sendable {
    let timezone: String?
    let localTime: String?
    let isShabbat: Bool?
}
