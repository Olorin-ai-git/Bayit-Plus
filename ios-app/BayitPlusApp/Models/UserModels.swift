import Foundation

// MARK: - Profile

/// Response from GET /api/v1/profiles/me
struct ProfileResponse: Decodable, Sendable, Identifiable {
    let id: String
    let email: String?
    let displayName: String?
    let avatar: String?
    let language: String?
    let createdAt: String?
    let updatedAt: String?
    let preferences: ProfilePreferences?
    let phoneNumber: String?
    let phoneVerified: Bool?
    let hasPassword: Bool?
    let authProvider: String?
    let emailVerified: Bool?
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
    let phoneNumber: String?
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
