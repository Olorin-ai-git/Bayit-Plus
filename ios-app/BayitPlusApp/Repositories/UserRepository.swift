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

    /// Fetch the user's playlist (backend returns all items, no pagination).
    func fetchPlaylist() async throws -> PlaylistResponse

    /// Toggle a content item in the playlist.
    func togglePlaylistItem(contentId: String, request: PlaylistToggleRequest) async throws -> PlaylistToggleResponse

    /// Check if a content item is in the playlist.
    func checkPlaylistItem(contentId: String) async throws -> PlaylistCheckResponse

    /// Reorder a playlist item to a new position.
    func reorderPlaylist(request: PlaylistReorderRequest) async throws -> MessageResponse

    /// Remove a content item from the playlist.
    func removePlaylistItem(contentId: String) async throws -> MessageResponse

    /// Clear all items from the playlist.
    func clearPlaylist() async throws -> MessageResponse

    // MARK: - Downloads

    /// Fetch the user's download list.
    func fetchDownloads() async throws -> [DownloadItem]

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

    // MARK: - Verification

    /// Send phone verification code via SMS.
    func sendPhoneVerification(phoneNumber: String) async throws -> PhoneVerificationSendResponse

    /// Verify phone with SMS code.
    func verifyPhone(code: String) async throws -> PhoneVerificationResponse

    /// Get current verification status.
    func getVerificationStatus() async throws -> VerificationStatusResponse

    // MARK: - Email Verification

    /// Send email verification link to the current user's email address.
    func sendEmailVerification() async throws -> MessageResponse

    // MARK: - Account Management

    /// Permanently delete the current user's account and all associated data.
    /// This action is irreversible per Apple App Store Guideline 5.1.1(v).
    func deleteAccount() async throws -> MessageResponse
}
