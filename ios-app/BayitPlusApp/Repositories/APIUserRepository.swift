import BayitNetworking
import Foundation

/// Production implementation of `UserRepository` using `APIClient`.
final class APIUserRepository: UserRepository, @unchecked Sendable {
    let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    // MARK: - Profile

    func fetchProfile() async throws -> ProfileResponse {
        return try await client.get(
            "/api/v1/profiles/me",
            as: ProfileResponse.self
        )
    }

    func updateProfile(request: ProfileUpdateRequest) async throws -> ProfileResponse {
        return try await client.put(
            "/api/v1/profiles/me",
            body: request,
            as: ProfileResponse.self
        )
    }

    func fetchProfileStats() async throws -> ProfileStats {
        return try await client.get(
            "/api/v1/profile/stats",
            as: ProfileStats.self
        )
    }

    // MARK: - Favorites

    func fetchFavorites(page: Int, limit: Int) async throws -> FavoritesResponse {
        let queryItems = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit)),
        ]
        return try await client.get(
            "/api/v1/favorites",
            queryItems: queryItems,
            as: FavoritesResponse.self
        )
    }

    func toggleFavorite(request: FavoriteToggleRequest) async throws -> FavoriteToggleResponse {
        return try await client.post(
            "/api/v1/favorites/toggle",
            body: request,
            as: FavoriteToggleResponse.self
        )
    }

    func checkFavorite(contentId: String) async throws -> FavoriteCheckResponse {
        return try await client.get(
            "/api/v1/favorites/check/\(contentId)",
            as: FavoriteCheckResponse.self
        )
    }

    func removeFavorite(contentId: String) async throws -> MessageResponse {
        return try await client.delete(
            "/api/v1/favorites/\(contentId)",
            as: MessageResponse.self
        )
    }

    // MARK: - Playlists

    func fetchPlaylist() async throws -> PlaylistResponse {
        return try await client.get(
            "/api/v1/playlist",
            as: PlaylistResponse.self
        )
    }

    func togglePlaylistItem(contentId: String, request: PlaylistToggleRequest) async throws -> PlaylistToggleResponse {
        return try await client.post(
            "/api/v1/playlist/toggle/\(contentId)",
            body: request,
            as: PlaylistToggleResponse.self
        )
    }

    func checkPlaylistItem(contentId: String) async throws -> PlaylistCheckResponse {
        return try await client.get(
            "/api/v1/playlist/check/\(contentId)",
            as: PlaylistCheckResponse.self
        )
    }

    func reorderPlaylist(request: PlaylistReorderRequest) async throws -> MessageResponse {
        return try await client.put(
            "/api/v1/playlist/items/reorder",
            body: request,
            as: MessageResponse.self
        )
    }

    func removePlaylistItem(contentId: String) async throws -> MessageResponse {
        return try await client.delete(
            "/api/v1/playlist/items/\(contentId)",
            as: MessageResponse.self
        )
    }

    func clearPlaylist() async throws -> MessageResponse {
        return try await client.delete(
            "/api/v1/playlist",
            as: MessageResponse.self
        )
    }
}
