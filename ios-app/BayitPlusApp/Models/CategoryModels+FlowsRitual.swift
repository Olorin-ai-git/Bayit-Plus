import Foundation

// MARK: - Flows

/// Response from GET /api/v1/flows
struct FlowsResponse: Decodable, Sendable {
    let flows: [FlowItem]
}

/// A content flow / sequence
struct FlowItem: Decodable, Sendable, Identifiable {
    let id: String
    let name: String?
    let nameKey: String?
    let description: String?
    let thumbnail: String?
    let items: [FlowContentItem]?
    let totalItems: Int?
    let duration: String?
}

/// A content item within a flow
struct FlowContentItem: Decodable, Sendable, Identifiable {
    let id: String
    let contentId: String?
    let title: String?
    let thumbnail: String?
    let duration: String?
    let type: String?
    let position: Int?
}

// MARK: - Morning Ritual

/// Response from GET /api/v1/ritual/check
struct RitualCheckResponse: Decodable, Sendable {
    let isAvailable: Bool?
    let completedToday: Bool?
    let streakDays: Int?
}

/// Response from GET /api/v1/ritual/content
struct RitualContentResponse: Decodable, Sendable {
    let items: [RitualItem]
    let date: String?
    let greeting: String?
}

/// A morning ritual content item
struct RitualItem: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let type: String?
    let thumbnail: String?
    let duration: String?
    let contentId: String?
    let position: Int?
    let isCompleted: Bool?
}

/// Response from GET /api/v1/ritual/ai-brief
struct RitualAIBriefResponse: Decodable, Sendable {
    let brief: String?
    let topics: [String]?
    let date: String?
}

/// Response from GET /api/v1/ritual/preferences
struct RitualPreferences: Decodable, Sendable {
    let enabled: Bool?
    let time: String?
    let includeNews: Bool?
    let includePrayer: Bool?
    let includeStudy: Bool?
    let language: String?
}

/// Request body for PUT /api/v1/ritual/preferences
struct RitualPreferencesUpdate: Encodable, Sendable {
    let enabled: Bool?
    let time: String?
    let includeNews: Bool?
    let includePrayer: Bool?
    let includeStudy: Bool?
    let language: String?
}
