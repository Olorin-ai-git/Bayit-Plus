import Foundation

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
    let descriptionEn: String?
    let thumbnail: String?
    let backdrop: String?
    let availableMovies: Int?
    let totalMovies: Int?
    let tmdbCollectionId: Int?
    let trailerStreamUrl: String?
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

    /// Returns localized description for the given language code.
    func localizedDescription(for lang: String) -> String? {
        switch lang {
        case "en":
            return descriptionEn ?? description
        default:
            return description ?? descriptionEn
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

    /// Average rating across movies that have ratings.
    var averageRating: String? {
        guard let movies = movies else { return nil }
        let ratings = movies.compactMap { $0.rating?.value }.compactMap { Double($0) }
        guard !ratings.isEmpty else { return nil }
        let avg = ratings.reduce(0, +) / Double(ratings.count)
        return String(format: "%.1f", avg)
    }
}

/// Movie within a collection
struct CollectionMovie: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let titleEn: String?
    let thumbnail: String?
    let year: Int?
    let duration: String?
    let collectionOrder: Int?
    let rating: FlexibleRating?
    let streamUrl: String?

    /// Returns localized title for the given language code.
    func localizedTitle(for lang: String) -> String? {
        switch lang {
        case "en":
            return titleEn ?? title
        default:
            return title ?? titleEn
        }
    }
}
