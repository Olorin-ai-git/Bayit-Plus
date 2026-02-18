import BayitNetworking
import Foundation

/// Repository protocol for user settings preferences API operations:
/// playback, audio, accessibility, and privacy preferences.
protocol UserSettingsRepository: Sendable {

    // MARK: - Playback

    /// Fetch playback preferences for current user.
    func fetchPlaybackPreferences() async throws -> PlaybackPreferencesDTO

    /// Update playback preferences.
    func updatePlaybackPreferences(
        request: PlaybackPreferencesDTO
    ) async throws -> PlaybackPreferencesResponse

    // MARK: - Audio

    /// Fetch audio preferences for current user.
    func fetchAudioPreferences() async throws -> AudioPreferencesDTO

    /// Update audio preferences.
    func updateAudioPreferences(
        request: AudioPreferencesDTO
    ) async throws -> AudioPreferencesResponse

    // MARK: - Accessibility

    /// Fetch accessibility preferences for current user.
    func fetchAccessibilityPreferences() async throws -> AccessibilityPreferencesDTO

    /// Update accessibility preferences.
    func updateAccessibilityPreferences(
        request: AccessibilityPreferencesDTO
    ) async throws -> AccessibilityPreferencesResponse

    // MARK: - Privacy

    /// Fetch privacy preferences for current user.
    func fetchPrivacyPreferences() async throws -> PrivacyPreferencesDTO

    /// Update privacy preferences.
    func updatePrivacyPreferences(
        request: PrivacyPreferencesDTO
    ) async throws -> PrivacyPreferencesResponse

    // MARK: - History

    /// Clear watch history.
    func clearWatchHistory() async throws -> MessageResponse

    /// Clear search history.
    func clearSearchHistory() async throws -> MessageResponse
}

/// Production implementation of `UserSettingsRepository` using `APIClient`.
final class APIUserSettingsRepository: UserSettingsRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    // MARK: - Playback

    func fetchPlaybackPreferences() async throws -> PlaybackPreferencesDTO {
        try await client.get(
            "/api/v1/profiles/preferences/playback",
            as: PlaybackPreferencesDTO.self
        )
    }

    func updatePlaybackPreferences(
        request: PlaybackPreferencesDTO
    ) async throws -> PlaybackPreferencesResponse {
        try await client.put(
            "/api/v1/profiles/preferences/playback",
            body: request,
            as: PlaybackPreferencesResponse.self
        )
    }

    // MARK: - Audio

    func fetchAudioPreferences() async throws -> AudioPreferencesDTO {
        try await client.get(
            "/api/v1/profiles/preferences/audio",
            as: AudioPreferencesDTO.self
        )
    }

    func updateAudioPreferences(
        request: AudioPreferencesDTO
    ) async throws -> AudioPreferencesResponse {
        try await client.put(
            "/api/v1/profiles/preferences/audio",
            body: request,
            as: AudioPreferencesResponse.self
        )
    }

    // MARK: - Accessibility

    func fetchAccessibilityPreferences() async throws -> AccessibilityPreferencesDTO {
        try await client.get(
            "/api/v1/profiles/preferences/accessibility",
            as: AccessibilityPreferencesDTO.self
        )
    }

    func updateAccessibilityPreferences(
        request: AccessibilityPreferencesDTO
    ) async throws -> AccessibilityPreferencesResponse {
        try await client.put(
            "/api/v1/profiles/preferences/accessibility",
            body: request,
            as: AccessibilityPreferencesResponse.self
        )
    }

    // MARK: - Privacy

    func fetchPrivacyPreferences() async throws -> PrivacyPreferencesDTO {
        try await client.get(
            "/api/v1/profiles/preferences/privacy",
            as: PrivacyPreferencesDTO.self
        )
    }

    func updatePrivacyPreferences(
        request: PrivacyPreferencesDTO
    ) async throws -> PrivacyPreferencesResponse {
        try await client.put(
            "/api/v1/profiles/preferences/privacy",
            body: request,
            as: PrivacyPreferencesResponse.self
        )
    }

    // MARK: - History

    func clearWatchHistory() async throws -> MessageResponse {
        try await client.delete(
            "/api/v1/history",
            as: MessageResponse.self
        )
    }

    func clearSearchHistory() async throws -> MessageResponse {
        try await client.delete(
            "/api/v1/search/history",
            as: MessageResponse.self
        )
    }
}
