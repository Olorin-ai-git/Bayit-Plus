import Foundation

// MARK: - Audiobooks

/// An audiobook with metadata and chapter information.
struct Audiobook: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let author: String?
    let narrator: String?
    let description: String?
    let thumbnail: String?
    let backdrop: String?
    let duration: String?
    let chapters: [AudiobookChapter]?
    let genreIds: [String]?
    let audioQuality: String?
    let requiresSubscription: String?
    let contentFormat: String?
    let viewCount: Int?
    let avgRating: Double?
    let isFeatured: Bool?
    let createdAt: String?
    let updatedAt: String?
}

/// A chapter within an audiobook.
struct AudiobookChapter: Decodable, Sendable, Identifiable {
    let id: String?
    let title: String?
    let startTime: Double?
    let endTime: Double?

    var stableId: String { id ?? "\(startTime ?? 0)" }
}

/// Paginated response from GET /api/v1/audiobooks
struct AudiobookListResponse: Decodable, Sendable {
    let items: [Audiobook]?
    let total: Int?
    let page: Int?
    let pageSize: Int?
    let totalPages: Int?
}
