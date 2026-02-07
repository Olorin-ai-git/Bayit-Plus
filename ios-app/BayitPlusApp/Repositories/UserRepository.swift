import BayitNetworking
import Foundation

/// Repository protocol for user-related API operations:
/// profile, favorites, playlists, downloads, and recordings.
protocol UserRepository: Sendable {

    // MARK: - Profile

    /// Fetch the current user's profile.
    func fetchProfile() async throws -> ProfileResponse

    /// Update the current user's profile.
    func updateProfile(request: ProfileUpdateRequest) async throws -> ProfileResponse

    /// Fetch profile statistics (watch time, favorites count, etc.).
    func fetchProfileStats() async throws -> ProfileStats

    // MARK: - Favorites

    /// Fetch the user's favorites list.
    func fetchFavorites(page: Int, limit: Int) async throws -> FavoritesResponse

    /// Toggle a content item's favorite status.
    func toggleFavorite(request: FavoriteToggleRequest) async throws -> FavoriteToggleResponse

    /// Check if a content item is favorited.
    func checkFavorite(contentId: String) async throws -> FavoriteCheckResponse

    /// Remove a content item from favorites.
    func removeFavorite(contentId: String) async throws -> MessageResponse

    // MARK: - Playlists

    /// Fetch the user's playlist.
    func fetchPlaylist(page: Int, limit: Int) async throws -> PlaylistResponse

    /// Toggle a content item in the playlist.
    func togglePlaylistItem(request: PlaylistToggleRequest) async throws -> PlaylistToggleResponse

    /// Check if a content item is in the playlist.
    func checkPlaylistItem(contentId: String) async throws -> PlaylistCheckResponse

    /// Reorder playlist items.
    func reorderPlaylist(request: PlaylistReorderRequest) async throws -> MessageResponse

    /// Remove a content item from the playlist.
    func removePlaylistItem(contentId: String) async throws -> MessageResponse

    // MARK: - Downloads

    /// Fetch the user's download list.
    func fetchDownloads() async throws -> DownloadsResponse

    /// Start downloading a content item.
    func startDownload(request: DownloadStartRequest) async throws -> DownloadStartResponse

    /// Check if a content item is downloaded.
    func checkDownload(contentId: String) async throws -> DownloadCheckResponse

    /// Delete a downloaded item.
    func deleteDownload(downloadId: String) async throws -> MessageResponse

    // MARK: - Recordings

    /// Fetch the user's DVR recordings.
    func fetchRecordings() async throws -> RecordingsResponse

    /// Start recording a program.
    func startRecording(request: RecordingStartRequest) async throws -> RecordingStartResponse

    /// Stop a recording.
    func stopRecording(recordingId: String) async throws -> MessageResponse

    /// Delete a recording.
    func deleteRecording(recordingId: String) async throws -> MessageResponse
}

/// Production implementation of `UserRepository` using `APIClient`.
final class APIUserRepository: UserRepository, @unchecked Sendable {

    private let client: APIClient

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
            URLQueryItem(name: "limit", value: String(limit))
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

    func fetchPlaylist(page: Int, limit: Int) async throws -> PlaylistResponse {
        let queryItems = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit))
        ]
        return try await client.get(
            "/api/v1/playlist",
            queryItems: queryItems,
            as: PlaylistResponse.self
        )
    }

    func togglePlaylistItem(request: PlaylistToggleRequest) async throws -> PlaylistToggleResponse {
        return try await client.post(
            "/api/v1/playlist/toggle",
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
            "/api/v1/playlist/reorder",
            body: request,
            as: MessageResponse.self
        )
    }

    func removePlaylistItem(contentId: String) async throws -> MessageResponse {
        return try await client.delete(
            "/api/v1/playlist/\(contentId)",
            as: MessageResponse.self
        )
    }

    // MARK: - Downloads

    func fetchDownloads() async throws -> DownloadsResponse {
        return try await client.get(
            "/api/v1/downloads",
            as: DownloadsResponse.self
        )
    }

    func startDownload(request: DownloadStartRequest) async throws -> DownloadStartResponse {
        return try await client.post(
            "/api/v1/downloads/start",
            body: request,
            as: DownloadStartResponse.self
        )
    }

    func checkDownload(contentId: String) async throws -> DownloadCheckResponse {
        return try await client.get(
            "/api/v1/downloads/check/\(contentId)",
            as: DownloadCheckResponse.self
        )
    }

    func deleteDownload(downloadId: String) async throws -> MessageResponse {
        return try await client.delete(
            "/api/v1/downloads/\(downloadId)",
            as: MessageResponse.self
        )
    }

    // MARK: - Recordings

    func fetchRecordings() async throws -> RecordingsResponse {
        return try await client.get(
            "/api/v1/recordings",
            as: RecordingsResponse.self
        )
    }

    func startRecording(request: RecordingStartRequest) async throws -> RecordingStartResponse {
        return try await client.post(
            "/api/v1/recordings/start",
            body: request,
            as: RecordingStartResponse.self
        )
    }

    func stopRecording(recordingId: String) async throws -> MessageResponse {
        return try await client.post(
            "/api/v1/recordings/\(recordingId)/stop",
            body: EmptyBody(),
            as: MessageResponse.self
        )
    }

    func deleteRecording(recordingId: String) async throws -> MessageResponse {
        return try await client.delete(
            "/api/v1/recordings/\(recordingId)",
            as: MessageResponse.self
        )
    }
}
