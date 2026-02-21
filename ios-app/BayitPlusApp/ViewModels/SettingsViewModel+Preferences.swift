import Foundation

// MARK: - Preference Updates

extension SettingsViewModel {
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
}
