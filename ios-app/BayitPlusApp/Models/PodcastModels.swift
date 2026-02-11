import Foundation

// MARK: - Podcasts

/// Response from GET /api/v1/podcasts
struct PodcastsResponse: Decodable, Sendable {
    let shows: [PodcastShow]
    let categories: [PodcastCategory]?
    let total: Int
    let page: Int
    let pages: Int
}

/// A podcast show
struct PodcastShow: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let author: String?
    let cover: String?
    let category: String?
    let cultureId: String?
    let episodeCount: Int?
    let latestEpisode: String?
    let availableLanguages: [String]?
}

/// A podcast category
struct PodcastCategory: Decodable, Sendable, Identifiable {
    let id: String
    let name: String
}

/// Response from GET /api/v1/podcasts/{show_id}
struct PodcastDetail: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let description: String?
    let author: String?
    let cover: String?
    let category: String?
    let website: String?
    let episodeCount: Int?
    let episodes: [PodcastEpisodeItem]?
    let latestEpisode: PodcastLatestEpisode?
}

/// Latest episode reference
struct PodcastLatestEpisode: Decodable, Sendable {
    let audioUrl: String?
}

/// A podcast episode
struct PodcastEpisodeItem: Decodable, Sendable, Identifiable {
    let id: String
    let title: String?
    let description: String?
    let audioUrl: String?
    let duration: String?
    let episodeNumber: Int?
    let seasonNumber: Int?
    let publishedAt: String?
    let thumbnail: String?
}

/// Response from GET /api/v1/podcasts/{show_id}/episodes
struct PodcastEpisodesResponse: Decodable, Sendable {
    let episodes: [PodcastEpisodeItem]
    let total: Int
    let page: Int
    let pages: Int
}

/// Response from GET /api/v1/podcasts/categories
struct PodcastCategoriesResponse: Decodable, Sendable {
    let categories: [PodcastCategory]
    let total: Int
}

/// Response from POST /api/v1/podcasts/{show_id}/sync
struct PodcastSyncResponse: Decodable, Sendable {
    let status: String
    let message: String?
    let episodesAdded: Int?
}

/// Response from POST /api/v1/podcasts/refresh
struct PodcastRefreshResponse: Decodable, Sendable {
    let status: String
    let message: String?
}
