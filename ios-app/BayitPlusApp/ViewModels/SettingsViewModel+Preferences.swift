import Foundation

// MARK: - Preference Updates

extension SettingsViewModel {
    @MainActor
    func updateAutoplay(_ enabled: Bool) async {
        autoplay = enabled
        await savePreference(UserPreferencesUpdate(
            autoTranslateEnabled: nil, showIsraelTime: nil, shabbatModeEnabled: nil,
            subtitlesEnabled: nil, interactiveMomentsEnabled: nil,
            showWidgetsDock: nil, showVoiceControlFAB: nil,
            autoplayEnabled: enabled, notificationsEnabled: nil
        ))
    }

    @MainActor
    func updateNotifications(_ enabled: Bool) async {
        notifications = enabled
        await savePreference(UserPreferencesUpdate(
            autoTranslateEnabled: nil, showIsraelTime: nil, shabbatModeEnabled: nil,
            subtitlesEnabled: nil, interactiveMomentsEnabled: nil,
            showWidgetsDock: nil, showVoiceControlFAB: nil,
            autoplayEnabled: nil, notificationsEnabled: enabled
        ))
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
}
