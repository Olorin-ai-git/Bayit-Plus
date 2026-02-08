import Foundation

// MARK: - Chapter Navigation

/// A chapter marker within content for navigation.
struct Chapter: Decodable, Sendable, Identifiable {
    let id: String?
    let title: String?
    let startTime: Double?
    let endTime: Double?
    let category: ChapterCategory?
    let summary: String?
    let thumbnail: String?

    var stableId: String { id ?? "\(startTime ?? 0)" }
}

/// Categories for chapter markers in news and entertainment content.
enum ChapterCategory: String, CaseIterable, Codable, Sendable {
    case intro
    case news
    case action
    case climax
    case security
    case economy
    case sports
    case interview
    case music
    case weather
}
