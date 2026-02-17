import BayitLocalization
import Foundation
import Observation

/// ViewModel for the Settings screen - manages user preferences and app settings.
@MainActor
@Observable
final class SettingsViewModel {
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var isSaving = false
    private(set) var isDeletingAccount = false
    private(set) var preferences: UserPreferencesDetail?
    private(set) var interactiveMomentsBlocked = false
    private(set) var interactiveMomentsBlockedMessage: String?

    var autoTranslate = false
    var showIsraelTime = false
    var shabbatMode = false
    var subtitles = false
    var autoplay = false
    var notifications = false
    var interactiveMoments = false

    private let settingsRepository: any SettingsRepository
    private let userRepository: any UserRepository
    private let avatarRepository: (any AvatarRepository)?

    init(
        settingsRepository: any SettingsRepository,
        userRepository: any UserRepository,
        avatarRepository: (any AvatarRepository)? = nil
    ) {
        self.settingsRepository = settingsRepository
        self.userRepository = userRepository
        self.avatarRepository = avatarRepository
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
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }

    @MainActor
    func updateAutoTranslate(_ enabled: Bool) async {
        autoTranslate = enabled
        await savePreference(UserPreferencesUpdate(
            autoTranslateEnabled: enabled,
            showIsraelTime: nil, shabbatModeEnabled: nil,
            subtitlesEnabled: nil, interactiveMomentsEnabled: nil
        ))
    }

    @MainActor
    func updateSubtitles(_ enabled: Bool) async {
        subtitles = enabled
        await savePreference(UserPreferencesUpdate(
            autoTranslateEnabled: nil,
            showIsraelTime: nil, shabbatModeEnabled: nil,
            subtitlesEnabled: enabled, interactiveMomentsEnabled: nil
        ))
    }

    @MainActor
    func updateInteractiveMoments(_ enabled: Bool) async {
        guard enabled else {
            interactiveMoments = false
            interactiveMomentsBlocked = false
            interactiveMomentsBlockedMessage = nil
            await savePreference(UserPreferencesUpdate(
                autoTranslateEnabled: nil,
                showIsraelTime: nil, shabbatModeEnabled: nil,
                subtitlesEnabled: nil, interactiveMomentsEnabled: false
            ))
            return
        }

        let hasPersona = await checkPersonaExists()
        if !hasPersona {
            interactiveMoments = false
            interactiveMomentsBlocked = true
            interactiveMomentsBlockedMessage =
                "settings.interactiveMomentsRequiresAvatar"
            return
        }

        interactiveMomentsBlocked = false
        interactiveMomentsBlockedMessage = nil
        interactiveMoments = true
        await savePreference(UserPreferencesUpdate(
            autoTranslateEnabled: nil,
            showIsraelTime: nil, shabbatModeEnabled: nil,
            subtitlesEnabled: nil, interactiveMomentsEnabled: true
        ))
    }

    @MainActor
    private func checkPersonaExists() async -> Bool {
        guard let repo = avatarRepository else { return false }
        do {
            let status = try await repo.fetchAvatarStatus(avatarId: "any")
            return status.avatarImageUrl != nil
                && status.status == "ready"
        } catch {
            return false
        }
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
                    preferences: update, phoneNumber: nil
                )
            )
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
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
                    preferences: update, phoneNumber: nil
                )
            )
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }
    }

    @MainActor
    func deleteAccount() async throws {
        isDeletingAccount = true
        error = nil

        do {
            _ = try await userRepository.deleteAccount()
            isDeletingAccount = false
        } catch {
            isDeletingAccount = false
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            throw error
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
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }
        isSaving = false
    }

    private func syncLocalState(from prefs: UserPreferencesDetail?) {
        autoTranslate = prefs?.autoTranslateEnabled ?? false
        showIsraelTime = prefs?.showIsraelTime ?? false
        shabbatMode = prefs?.shabbatModeEnabled ?? false
        subtitles = prefs?.subtitlesEnabled ?? false
        interactiveMoments = prefs?.interactiveMomentsEnabled ?? false
    }
}
