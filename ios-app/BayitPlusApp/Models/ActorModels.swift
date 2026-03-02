import Foundation

// MARK: - Actor List Item

/// Item from GET /api/v1/content/actors (array response)
struct ActorListItem: Decodable, Sendable, Identifiable {
    let name: String
    let movieCount: Int
    let profileUrl: String?

    var id: String {
        name
    }

    /// Convert to ContentItem for display in the VOD grid alongside movies/series/collections
    func toContentItem() -> ContentItem {
        ContentItem(
            id: name,
            title: name,
            description: "\(movieCount) films",
            thumbnail: profileUrl,
            backdrop: nil,
            duration: nil,
            year: nil,
            category: nil,
            categorySlug: nil,
            categoryNameKey: nil,
            categoryNameEn: nil,
            categoryNameEs: nil,
            type: "actor",
            totalEpisodes: nil,
            availableSubtitleLanguages: nil,
            hasSubtitles: nil,
            author: nil,
            narrator: nil,
            isCollectionParent: nil,
            availableMovies: movieCount,
            totalMovies: nil,
            contentRating: nil,
            genre: nil,
            genreIds: nil
        )
    }
}

// MARK: - Actor Detail

/// Response from GET /api/v1/content/actors/{actor_name}
struct ActorDetail: Decodable, Sendable, Identifiable {
    let name: String
    let movieCount: Int
    let profileUrl: String?
    let biography: String?
    let birthday: String?
    let placeOfBirth: String?
    let movies: [ActorMovie]

    var id: String {
        name
    }
}

/// Movie within an actor's filmography
struct ActorMovie: Decodable, Sendable, Identifiable {
    let id: String
    let title: String
    let titleEn: String?
    let year: Int?
    let thumbnail: String?
    let duration: String?
    let rating: FlexibleRating?

    func localizedTitle(for lang: String) -> String {
        switch lang {
        case "en":
            return titleEn ?? title
        default:
            return title
        }
    }
}
