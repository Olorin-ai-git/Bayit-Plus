import Foundation

// MARK: - Flexible Rating

/// Decodes a rating value that may arrive as a number (7.654) or string ("PG-13") from the API.
struct FlexibleRating: Decodable, Sendable {
    let value: String

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let doubleValue = try? container.decode(Double.self) {
            value = String(format: "%.1f", doubleValue)
        } else if let stringValue = try? container.decode(String.self) {
            value = stringValue
        } else {
            value = ""
        }
    }
}

// MARK: - Featured / Home

/// Response from GET /api/v1/content/featured
struct FeaturedResponse: Decodable, Sendable {
    let hero: HeroContent?
    let spotlight: [SpotlightItem]
    let categories: [ContentCategory]
}

/// Hero content displayed at the top of the home screen
struct HeroContent: Decodable, Sendable, Identifiable {
    let id: String?
    let title: String?
    let description: String?
    let backdrop: String?
    let thumbnail: String?
    let category: String?
    let year: Int?
    let duration: String?
    let rating: FlexibleRating?
}

/// Spotlight carousel item
struct SpotlightItem: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let description: String?
    let backdrop: String?
    let thumbnail: String?
    let category: String?
    let type: String?
    let year: Int?
    let duration: String?
    let rating: FlexibleRating?
    let totalEpisodes: Int?
    let availableSubtitleLanguages: [String]?
    let hasSubtitles: Bool?
}

/// Response from GET /api/v1/content/categories
struct CategoriesResponse: Decodable, Sendable {
    let categories: [ContentCategory]
}

/// A content category row (movies, series, podcasts, etc.)
///
/// Used in two contexts:
/// - `/content/featured` returns categories WITH `items` (home screen rows).
/// - `/content/categories` returns categories WITHOUT `items` (filter chips).
/// `items` defaults to empty when absent from JSON.
struct ContentCategory: Decodable, Sendable, Identifiable {
    let id: String
    let name: String
    let nameKey: String?
    let nameEn: String?
    let nameEs: String?
    let slug: String?
    let items: [ContentItem]

    private enum CodingKeys: String, CodingKey {
        case id, name, nameKey, nameEn, nameEs, slug, items
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        nameKey = try container.decodeIfPresent(String.self, forKey: .nameKey)
        nameEn = try container.decodeIfPresent(String.self, forKey: .nameEn)
        nameEs = try container.decodeIfPresent(String.self, forKey: .nameEs)
        slug = try container.decodeIfPresent(String.self, forKey: .slug)
        items = try container.decodeIfPresent([ContentItem].self, forKey: .items) ?? []
    }
}

/// A content item within a category row or search results
struct ContentItem: Decodable, Sendable, Identifiable, Hashable {
    let id: String
    let title: String?
    let description: String?
    let thumbnail: String?
    let backdrop: String?
    let duration: String?
    let year: Int?
    let category: String?
    let categorySlug: String?
    let categoryNameKey: String?
    let categoryNameEn: String?
    let categoryNameEs: String?
    let type: String?
    let totalEpisodes: Int?
    let availableSubtitleLanguages: [String]?
    let hasSubtitles: Bool?
    let author: String?
    let narrator: String?
    let isCollectionParent: Bool?
    let availableMovies: Int?
    let totalMovies: Int?
    let contentRating: String?
    let genre: String?
    let genreIds: [String]?

    /// Whether this content has a Hebrew dub (inferred from subtitle languages for now)
    var hasHebrewDub: Bool {
        availableSubtitleLanguages?.contains("he") == true
    }

    static func == (lhs: ContentItem, rhs: ContentItem) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}
