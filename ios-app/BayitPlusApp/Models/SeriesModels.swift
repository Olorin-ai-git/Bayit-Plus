import Foundation

// MARK: - Series

/// Response from GET /api/v1/content/series/{series_id}
struct SeriesDetail: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let description: String?
    let thumbnail: String?
    let backdrop: String?
    let category: String?
    let year: Int?
    let rating: String?
    let genre: String?
    let cast: [String]?
    let director: String?
    let totalSeasons: Int?
    let totalEpisodes: Int?
    let trailerUrl: String?
    let trailerStreamUrl: String?
    let previewUrl: String?
    let tmdbId: String?
    let imdbId: String?
    let availableSubtitleLanguages: [String]?
    let hasSubtitles: Bool?
    let isKidsContent: Bool?
    let ageRating: String?
    let seasons: [SeasonSummary]?
    let related: [RelatedItem]?

    private struct FlexRating: Decodable {
        let value: String?

        init(from decoder: Decoder) throws {
            let container = try decoder.singleValueContainer()
            if let str = try? container.decode(String.self) {
                value = str
            } else if let num = try? container.decode(Double.self) {
                value = String(format: "%.1f", num)
            } else {
                value = nil
            }
        }
    }

    enum CodingKeys: String, CodingKey {
        case id, title, description, thumbnail, backdrop, category, year
        case rating, genre, cast, director
        case totalSeasons, totalEpisodes
        case trailerUrl, trailerStreamUrl, previewUrl
        case tmdbId, imdbId
        case availableSubtitleLanguages, hasSubtitles
        case isKidsContent, ageRating, seasons, related
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        title = try c.decodeIfPresent(String.self, forKey: .title)
        description = try c.decodeIfPresent(String.self, forKey: .description)
        thumbnail = try c.decodeIfPresent(String.self, forKey: .thumbnail)
        backdrop = try c.decodeIfPresent(String.self, forKey: .backdrop)
        category = try c.decodeIfPresent(String.self, forKey: .category)
        year = try c.decodeIfPresent(Int.self, forKey: .year)
        genre = try c.decodeIfPresent(String.self, forKey: .genre)
        cast = try c.decodeIfPresent([String].self, forKey: .cast)
        director = try c.decodeIfPresent(String.self, forKey: .director)
        totalSeasons = try c.decodeIfPresent(Int.self, forKey: .totalSeasons)
        totalEpisodes = try c.decodeIfPresent(Int.self, forKey: .totalEpisodes)
        trailerUrl = try c.decodeIfPresent(String.self, forKey: .trailerUrl)
        trailerStreamUrl = try c.decodeIfPresent(String.self, forKey: .trailerStreamUrl)
        previewUrl = try c.decodeIfPresent(String.self, forKey: .previewUrl)
        tmdbId = try c.decodeIfPresent(String.self, forKey: .tmdbId)
        imdbId = try c.decodeIfPresent(String.self, forKey: .imdbId)
        availableSubtitleLanguages = try c.decodeIfPresent([String].self, forKey: .availableSubtitleLanguages)
        hasSubtitles = try c.decodeIfPresent(Bool.self, forKey: .hasSubtitles)
        isKidsContent = try c.decodeIfPresent(Bool.self, forKey: .isKidsContent)
        ageRating = try c.decodeIfPresent(String.self, forKey: .ageRating)
        seasons = try c.decodeIfPresent([SeasonSummary].self, forKey: .seasons)
        related = try c.decodeIfPresent([RelatedItem].self, forKey: .related)
        rating = try c.decodeIfPresent(FlexRating.self, forKey: .rating)?.value
    }
}

/// Summary of a season within a series
struct SeasonSummary: Decodable, Sendable, Identifiable {
    let seasonNumber: Int
    let episodeCount: Int
    let firstEpisodeId: String?
    let firstEpisodeThumbnail: String?

    var id: Int {
        seasonNumber
    }
}

/// Response from GET /api/v1/content/series/{series_id}/season/{season_num}/episodes
struct SeasonEpisodesResponse: Decodable, Sendable {
    let seriesId: String
    let seasonNumber: Int
    let episodes: [EpisodeItem]
}

/// An episode within a season
struct EpisodeItem: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let description: String?
    let thumbnail: String?
    let episodeNumber: Int?
    let duration: String?
    let previewUrl: String?
    let streamUrl: String?
    let directUrl: String?
    let isTranscoded: Bool?
}

/// Response from GET /api/v1/content/series
struct SeriesListResponse: Decodable, Sendable {
    let items: [ContentItem]
    let total: Int
    let page: Int
    let limit: Int
}
