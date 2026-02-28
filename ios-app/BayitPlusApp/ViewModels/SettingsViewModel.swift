import BayitLocalization
import Foundation
import Observation

/// ViewModel for the Settings screen - manages user preferences and app settings.
@MainActor
@Observable
final class SettingsViewModel {
    var isLoading = false
    var error: String?
    var isSaving = false
    var isDeletingAccount = false
    var preferences: UserPreferencesDetail?
    var interactiveMomentsBlocked = false
    var interactiveMomentsBlockedMessage: String?

    var autoTranslate = false
    var showIsraelTime = false
    var shabbatMode = false
    var subtitles = false
    var autoplay = false
    var notifications = false
    var interactiveMoments = false
    var showWidgetsDock = false
    var showVoiceControlFAB = false

    let settingsRepository: any SettingsRepository
    let userRepository: any UserRepository
    let avatarRepository: (any AvatarRepository)?
    private let uiPreferences: UserUIPreferencesStore?

    init(
        settingsRepository: any SettingsRepository,
        userRepository: any UserRepository,
        avatarRepository: (any AvatarRepository)? = nil,
        uiPreferences: UserUIPreferencesStore? = nil
    ) {
        self.settingsRepository = settingsRepository
        self.userRepository = userRepository
        self.avatarRepository = avatarRepository
        self.uiPreferences = uiPreferences
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
            subtitlesEnabled: nil, interactiveMomentsEnabled: nil,
            showWidgetsDock: nil, showVoiceControlFAB: nil
        ))
    }

    @MainActor
    func updateSubtitles(_ enabled: Bool) async {
        subtitles = enabled
        await savePreference(UserPreferencesUpdate(
            autoTranslateEnabled: nil,
            showIsraelTime: nil, shabbatModeEnabled: nil,
            subtitlesEnabled: enabled, interactiveMomentsEnabled: nil,
            showWidgetsDock: nil, showVoiceControlFAB: nil
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
                subtitlesEnabled: nil, interactiveMomentsEnabled: false,
                showWidgetsDock: nil, showVoiceControlFAB: nil
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
            subtitlesEnabled: nil, interactiveMomentsEnabled: true,
            showWidgetsDock: nil, showVoiceControlFAB: nil
        ))
    }

    @MainActor
    func updateShowWidgetsDock(_ enabled: Bool) async {
        showWidgetsDock = enabled
        uiPreferences?.showWidgetsDock = enabled
        await savePreference(UserPreferencesUpdate(
            autoTranslateEnabled: nil, showIsraelTime: nil, shabbatModeEnabled: nil,
            subtitlesEnabled: nil, interactiveMomentsEnabled: nil,
            showWidgetsDock: enabled, showVoiceControlFAB: nil
        ))
    }

    @MainActor
    func updateShowVoiceControlFAB(_ enabled: Bool) async {
        showVoiceControlFAB = enabled
        uiPreferences?.showVoiceControlFAB = enabled
        await savePreference(UserPreferencesUpdate(
            autoTranslateEnabled: nil, showIsraelTime: nil, shabbatModeEnabled: nil,
            subtitlesEnabled: nil, interactiveMomentsEnabled: nil,
            showWidgetsDock: nil, showVoiceControlFAB: enabled
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

    // MARK: - Private

    @MainActor
    private func savePreference(_ update: UserPreferencesUpdate) async {
        isSaving = true
        do {
            let response = try await settingsRepository.updatePreferences(
                request: update
            )
            preferences = response.preferences
            uiPreferences?.apply(response.preferences)
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
        showWidgetsDock = prefs?.showWidgetsDock ?? false
        showVoiceControlFAB = prefs?.showVoiceControlFAB ?? false
    }
}
