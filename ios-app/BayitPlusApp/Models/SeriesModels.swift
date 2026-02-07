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
    let previewUrl: String?
    let tmdbId: String?
    let imdbId: String?
    let availableSubtitleLanguages: [String]?
    let hasSubtitles: Bool?
    let isKidsContent: Bool?
    let ageRating: String?
    let seasons: [SeasonSummary]?
    let related: [RelatedItem]?
}

/// Summary of a season within a series
struct SeasonSummary: Decodable, Sendable, Identifiable {
    let seasonNumber: Int
    let episodeCount: Int
    let firstEpisodeId: String?
    let firstEpisodeThumbnail: String?

    var id: Int { seasonNumber }
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
