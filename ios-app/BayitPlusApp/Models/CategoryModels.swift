import Foundation

// MARK: - Shared Category Types

/// A content category within children, youngsters, or judaism sections
struct SectionCategory: Decodable, Sendable, Identifiable {
    let id: String
    let name: String?
    let nameKey: String?
    let nameEn: String?
    let nameEs: String?
    let thumbnail: String?
    let description: String?
    let itemCount: Int?
}

/// A content item within a category section
struct SectionContentItem: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let thumbnail: String?
    let duration: String?
    let year: Int?
    let type: String?
    let category: String?
    let ageGroup: String?
    let rating: String?
}

/// Featured content for a section
struct SectionFeatured: Decodable, Sendable {
    let hero: SectionContentItem?
    let items: [SectionContentItem]
}

// MARK: - Children

/// Response from GET /api/v1/children/categories
struct ChildrenCategoriesResponse: Decodable, Sendable {
    let categories: [SectionCategory]
}

/// Response from GET /api/v1/children/content
struct ChildrenContentResponse: Decodable, Sendable {
    let items: [SectionContentItem]
    let total: Int?
    let page: Int?
    let pages: Int?
}

/// Response from GET /api/v1/children/featured
struct ChildrenFeaturedResponse: Decodable, Sendable {
    let featured: SectionFeatured?
    let categories: [SectionCategory]?
}

/// Response from GET /api/v1/children/age-groups
struct AgeGroupsResponse: Decodable, Sendable {
    let groups: [AgeGroup]
}

/// An age group filter for children content
struct AgeGroup: Decodable, Sendable, Identifiable {
    let id: String
    let name: String?
    let nameKey: String?
    let minAge: Int?
    let maxAge: Int?
}

// MARK: - Youngsters

/// Response from GET /api/v1/youngsters/categories
struct YoungstersCategoriesResponse: Decodable, Sendable {
    let categories: [SectionCategory]
}

/// Response from GET /api/v1/youngsters/content
struct YoungsterContentResponse: Decodable, Sendable {
    let items: [SectionContentItem]
    let total: Int?
    let page: Int?
    let pages: Int?
}

/// Response from GET /api/v1/youngsters/featured
struct YoungstersFeaturedResponse: Decodable, Sendable {
    let featured: SectionFeatured?
    let categories: [SectionCategory]?
}

/// Response from GET /api/v1/youngsters/trending
struct YoungstersTrendingResponse: Decodable, Sendable {
    let items: [SectionContentItem]
}

/// Response from GET /api/v1/youngsters/news
struct YoungstersNewsResponse: Decodable, Sendable {
    let items: [NewsItem]
}

// MARK: - Judaism

/// Response from GET /api/v1/judaism/categories
struct JudaismCategoriesResponse: Decodable, Sendable {
    let categories: [SectionCategory]
}

/// Response from GET /api/v1/judaism/content
struct JudaismContentResponse: Decodable, Sendable {
    let items: [SectionContentItem]
    let total: Int?
    let page: Int?
    let pages: Int?
}

/// Response from GET /api/v1/judaism/calendar
struct JudaismCalendarResponse: Decodable, Sendable {
    let events: [CalendarEvent]
}

/// A Jewish calendar event
struct CalendarEvent: Decodable, Sendable, Identifiable {
    let id: String
    let name: String?
    let nameKey: String?
    let date: String?
    let type: String?
    let description: String?
    let relatedContent: [SectionContentItem]?
}

/// Response from GET /api/v1/judaism/news
struct JudaismNewsResponse: Decodable, Sendable {
    let items: [NewsItem]
}

/// A news item shared by youngsters and judaism sections
struct NewsItem: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let summary: String?
    let thumbnail: String?
    let source: String?
    let publishedAt: String?
    let url: String?
}

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
