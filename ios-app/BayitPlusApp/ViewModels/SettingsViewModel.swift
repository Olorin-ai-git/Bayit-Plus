import BayitLocalization
import Foundation
import Observation

/// ViewModel for the Settings screen - manages user preferences and app settings.
@Observable
final class SettingsViewModel {
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var isSaving = false
    private(set) var preferences: UserPreferencesDetail?

    var autoTranslate = false
    var showIsraelTime = false
    var shabbatMode = false
    var subtitles = false
    var autoplay = false
    var notifications = false

    private let settingsRepository: any SettingsRepository
    private let userRepository: any UserRepository

    init(
        settingsRepository: any SettingsRepository,
        userRepository: any UserRepository
    ) {
        self.settingsRepository = settingsRepository
        self.userRepository = userRepository
    }

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let response = try await settingsRepository.fetchPreferences()
            preferences = response.preferences
            syncLocalState(from: response.preferences)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func updateAutoTranslate(_ enabled: Bool) async {
        autoTranslate = enabled
        await savePreference(UserPreferencesUpdate(
            autoTranslateEnabled: enabled,
            showIsraelTime: nil, shabbatModeEnabled: nil, subtitlesEnabled: nil
        ))
    }

    @MainActor
    func updateSubtitles(_ enabled: Bool) async {
        subtitles = enabled
        await savePreference(UserPreferencesUpdate(
            autoTranslateEnabled: nil,
            showIsraelTime: nil, shabbatModeEnabled: nil, subtitlesEnabled: enabled
        ))
    }

    @MainActor
    func updateAutoplay(_ enabled: Bool) async {
        autoplay = enabled
        let update = ProfilePreferencesUpdate(
            language: nil, subtitleLanguage: nil,
            autoplay: enabled, notifications: nil,
            contentRating: nil, quality: nil
        )
        do {
            _ = try await userRepository.updateProfile(
                request: ProfileUpdateRequest(
                    displayName: nil, avatar: nil, language: nil,
                    preferences: update
                )
            )
        } catch {
            self.error = error.localizedDescription
        }
    }

    @MainActor
    func updateNotifications(_ enabled: Bool) async {
        notifications = enabled
        let update = ProfilePreferencesUpdate(
            language: nil, subtitleLanguage: nil,
            autoplay: nil, notifications: enabled,
            contentRating: nil, quality: nil
        )
        do {
            _ = try await userRepository.updateProfile(
                request: ProfileUpdateRequest(
                    displayName: nil, avatar: nil, language: nil,
                    preferences: update
                )
            )
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Private

    @MainActor
    private func savePreference(_ update: UserPreferencesUpdate) async {
        isSaving = true
        do {
            let response = try await settingsRepository.updatePreferences(
                request: update
            )
            preferences = response.preferences
        } catch {
            self.error = error.localizedDescription
        }
        isSaving = false
    }

    private func syncLocalState(from prefs: UserPreferencesDetail?) {
        autoTranslate = prefs?.autoTranslateEnabled ?? false
        showIsraelTime = prefs?.showIsraelTime ?? false
        shabbatMode = prefs?.shabbatModeEnabled ?? false
        subtitles = prefs?.subtitlesEnabled ?? false
    }
}
