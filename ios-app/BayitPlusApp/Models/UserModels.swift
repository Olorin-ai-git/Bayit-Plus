import Foundation

// MARK: - Profile

/// Response from GET /api/v1/profiles/me
struct ProfileResponse: Decodable, Sendable, Identifiable {
    let id: String
    let email: String?
    let displayName: String?
    let avatar: String?
    let language: String?
    let isBetaUser: Bool?
    let betaCredits: Int?
    let createdAt: String?
    let updatedAt: String?
    let preferences: ProfilePreferences?
}

/// User preferences nested within ProfileResponse
struct ProfilePreferences: Decodable, Sendable {
    let language: String?
    let subtitleLanguage: String?
    let autoplay: Bool?
    let notifications: Bool?
    let contentRating: String?
    let quality: String?
}

/// Request body for PUT /api/v1/profiles/me
struct ProfileUpdateRequest: Encodable, Sendable {
    let displayName: String?
    let avatar: String?
    let language: String?
    let preferences: ProfilePreferencesUpdate?
}

/// Preferences update nested within ProfileUpdateRequest
struct ProfilePreferencesUpdate: Encodable, Sendable {
    let language: String?
    let subtitleLanguage: String?
    let autoplay: Bool?
    let notifications: Bool?
    let contentRating: String?
    let quality: String?
}

/// Response from GET /api/v1/profile/stats
struct ProfileStats: Decodable, Sendable {
    let totalWatched: Int?
    let totalFavorites: Int?
    let totalPlaylists: Int?
    let totalDownloads: Int?
    let totalRecordings: Int?
    let watchTimeMinutes: Int?
    let streakDays: Int?
}

// MARK: - Favorites

/// Response from GET /api/v1/favorites
struct FavoritesResponse: Decodable, Sendable {
    let items: [FavoriteItem]
    let total: Int?
    let page: Int?
    let pages: Int?
}

/// A favorited content item
struct FavoriteItem: Decodable, Sendable, Identifiable {
    let id: String
    let contentId: String?
    let title: String?
    let thumbnail: String?
    let type: String?
    let duration: String?
    let year: Int?
    let addedAt: String?
}

/// Response from POST /api/v1/favorites/toggle
struct FavoriteToggleResponse: Decodable, Sendable {
    let isFavorite: Bool?
    let message: String?
}

/// Response from GET /api/v1/favorites/check/{content_id}
struct FavoriteCheckResponse: Decodable, Sendable {
    let isFavorite: Bool?
}

/// Request body for POST /api/v1/favorites/toggle
struct FavoriteToggleRequest: Encodable, Sendable {
    let contentId: String
    let contentType: String?
}

// MARK: - Playlists

/// Response from GET /api/v1/playlist
struct PlaylistResponse: Decodable, Sendable {
    let items: [PlaylistItem]
    let total: Int?
    let page: Int?
    let pages: Int?
}

/// A playlist content item
struct PlaylistItem: Decodable, Sendable, Identifiable {
    let id: String
    let contentId: String?
    let title: String?
    let thumbnail: String?
    let type: String?
    let duration: String?
    let year: Int?
    let position: Int?
    let addedAt: String?
}

/// Response from POST /api/v1/playlist/toggle
struct PlaylistToggleResponse: Decodable, Sendable {
    let inPlaylist: Bool?
    let message: String?
}

/// Response from GET /api/v1/playlist/check/{content_id}
struct PlaylistCheckResponse: Decodable, Sendable {
    let inPlaylist: Bool?
}

/// Request body for POST /api/v1/playlist/toggle
struct PlaylistToggleRequest: Encodable, Sendable {
    let contentId: String
    let contentType: String?
}

/// Request body for PUT /api/v1/playlist/reorder
struct PlaylistReorderRequest: Encodable, Sendable {
    let itemIds: [String]
}

// MARK: - Downloads

/// Response from GET /api/v1/downloads
struct DownloadsResponse: Decodable, Sendable {
    let items: [DownloadItem]
    let total: Int?
}

/// A downloaded content item
struct DownloadItem: Decodable, Sendable, Identifiable {
    let id: String
    let contentId: String?
    let title: String?
    let thumbnail: String?
    let type: String?
    let duration: String?
    let fileSize: Int?
    let downloadDate: String?
    let status: String?
    let progress: Double?
}

/// Response from POST /api/v1/downloads/start
struct DownloadStartResponse: Decodable, Sendable {
    let downloadId: String?
    let message: String?
    let streamUrl: String?
}

/// Request body for POST /api/v1/downloads/start
struct DownloadStartRequest: Encodable, Sendable {
    let contentId: String
    let quality: String?
}

/// Response from GET /api/v1/downloads/check/{content_id}
struct DownloadCheckResponse: Decodable, Sendable {
    let isDownloaded: Bool?
    let downloadId: String?
}

// MARK: - Recordings

/// Response from GET /api/v1/recordings
struct RecordingsResponse: Decodable, Sendable {
    let items: [RecordingItem]
    let total: Int?
}

/// A DVR recording item
struct RecordingItem: Decodable, Sendable, Identifiable {
    let id: String
    let channelId: String?
    let channelName: String?
    let programTitle: String?
    let thumbnail: String?
    let startTime: String?
    let endTime: String?
    let duration: String?
    let status: String?
    let fileSize: Int?
    let recordedAt: String?
}

/// Request body for POST /api/v1/recordings/start
struct RecordingStartRequest: Encodable, Sendable {
    let channelId: String
    let programId: String?
    let duration: Int?
}

/// Response from POST /api/v1/recordings/start
struct RecordingStartResponse: Decodable, Sendable {
    let recordingId: String?
    let message: String?
}
