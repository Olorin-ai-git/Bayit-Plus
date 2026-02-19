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
    let isSeries: Bool?
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
    let isSeries: Bool?
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

// MARK: - Content Discovery

/// Response from GET /api/v1/content/all
struct ContentListResponse: Decodable, Sendable {
    let items: [ContentItem]
    let total: Int
    let page: Int
    let limit: Int
}

// MARK: - Content Detail

/// Response from GET /api/v1/content/{content_id}
struct ContentDetail: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let description: String?
    let thumbnail: String?
    let backdrop: String?
    let category: String?
    let duration: String?
    let year: Int?
    let rating: FlexibleRating?
    let genre: String?
    let cast: [String]?
    let director: String?
    let isSeries: Bool?
    let type: String?
    let availableSubtitleLanguages: [String]?
    let hasSubtitles: Bool?
    let related: [RelatedItem]?
    let streamUrl: String?
    let directUrl: String?
    let streamType: String?
    let previewUrl: String?
    let trailerUrl: String?
    let isTranscoded: Bool?
}

/// Related content item shown on detail pages
struct RelatedItem: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let thumbnail: String?
    let duration: String?
    let year: Int?
    let type: String?
}

// MARK: - Collections

/// Item from GET /api/v1/content/collections (array response)
struct CollectionListItem: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let titleEn: String?
    let thumbnail: String?
    let backdrop: String?
    let promoText: String?
    let promoTextEn: String?
    let availableMovies: Int
    let totalMovies: Int
    let tmdbCollectionId: Int?

    /// Returns localized promo text based on device locale, falling back to English then Hebrew.
    var localizedPromoText: String? {
        localizedPromoText(for: Locale.current.language.languageCode?.identifier ?? "en")
    }

    /// Returns localized promo text for the given language code.
    func localizedPromoText(for lang: String) -> String? {
        let localized: String? = (lang == "he") ? promoText : promoTextEn
        return localized ?? promoTextEn ?? promoText
    }

    /// Convert to ContentItem for display in the VOD grid
    func toContentItem() -> ContentItem {
        ContentItem(
            id: id,
            title: title,
            description: localizedPromoText,
            thumbnail: thumbnail,
            backdrop: backdrop,
            duration: nil,
            year: nil,
            category: nil,
            categorySlug: nil,
            categoryNameKey: nil,
            categoryNameEn: nil,
            categoryNameEs: nil,
            type: "collection",
            isSeries: nil,
            totalEpisodes: nil,
            availableSubtitleLanguages: nil,
            hasSubtitles: nil,
            author: nil,
            narrator: nil,
            isCollectionParent: true,
            availableMovies: availableMovies,
            totalMovies: totalMovies,
            contentRating: nil,
            genre: nil,
            genreIds: nil
        )
    }
}

/// Response from GET /api/v1/content/collections/{id}
struct CollectionDetail: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let titleEn: String?
    let description: String?
    let thumbnail: String?
    let backdrop: String?
    let availableMovies: Int?
    let totalMovies: Int?
    let promoText: String?
    let promoTextEn: String?
    let promoTextEs: String?
    let promoTextFr: String?
    let promoTextIt: String?
    let promoTextHi: String?
    let promoTextTa: String?
    let promoTextBn: String?
    let promoTextJa: String?
    let promoTextZh: String?
    let movies: [CollectionMovie]?

    /// Returns localized title for the given language code from Bayit+ localization.
    func localizedTitle(for lang: String) -> String? {
        switch lang {
        case "en":
            return titleEn ?? title
        default:
            return title ?? titleEn
        }
    }

    /// Returns localized promo text based on device locale, falling back to English then Hebrew.
    var localizedPromoText: String? {
        localizedPromoText(for: Locale.current.language.languageCode?.identifier ?? "en")
    }

    /// Returns localized promo text for the given language code.
    func localizedPromoText(for lang: String) -> String? {
        let localized: String? = switch lang {
        case "he": promoText
        case "en": promoTextEn
        case "es": promoTextEs
        case "fr": promoTextFr
        case "it": promoTextIt
        case "hi": promoTextHi
        case "ta": promoTextTa
        case "bn": promoTextBn
        case "ja": promoTextJa
        case "zh": promoTextZh
        default: promoTextEn
        }
        return localized ?? promoTextEn ?? promoText
    }
}

/// Movie within a collection
struct CollectionMovie: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let thumbnail: String?
    let year: Int?
    let duration: String?
    let collectionOrder: Int?
}

// MARK: - Search

/// Response from POST /api/v1/content/search
@available(*, deprecated, message: "Use UnifiedSearchResponse from SearchModels.swift instead")
struct SearchResponse: Decodable, Sendable {
    let query: String
    let results: [SearchResult]
    let total: Int
}

/// A search result item
@available(*, deprecated, message: "Use UnifiedSearchResult from SearchModels.swift instead")
struct SearchResult: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let thumbnail: String?
    let duration: String?
    let year: Int?
    let category: String?
    let type: String?
    let availableSubtitleLanguages: [String]?
    let hasSubtitles: Bool?
}

/// Search request body
@available(*, deprecated, message: "Use SearchRepository.unifiedSearch() instead")
struct SearchRequest: Encodable, Sendable {
    let query: String
    let type: String?
    let page: Int?
    let limit: Int?
}
