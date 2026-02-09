import Foundation
import Observation

/// ViewModel for the Profile screen - manages user profile data and statistics.
@Observable
final class ProfileViewModel {
    private(set) var profile: ProfileResponse?
    private(set) var stats: ProfileStats?
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var isSaving = false

    private let repository: any UserRepository

    init(repository: any UserRepository) {
        self.repository = repository
    }

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            async let profileResult = repository.fetchProfile()
            async let statsResult = repository.fetchProfileStats()
            profile = try await profileResult
            stats = try await statsResult
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func updateProfile(displayName: String?, avatar: String?, language: String?) async {
        isSaving = true
        error = nil

        do {
            let request = ProfileUpdateRequest(
                displayName: displayName,
                avatar: avatar,
                language: language,
                preferences: nil,
                phoneNumber: nil
            )
            profile = try await repository.updateProfile(request: request)
        } catch {
            self.error = error.localizedDescription
        }

        isSaving = false
    }

    @MainActor
    func updatePreferences(_ preferences: ProfilePreferencesUpdate) async {
        isSaving = true
        error = nil

        do {
            let request = ProfileUpdateRequest(
                displayName: nil,
                avatar: nil,
                language: nil,
                preferences: preferences,
                phoneNumber: nil
            )
            profile = try await repository.updateProfile(request: request)
        } catch {
            self.error = error.localizedDescription
        }

        isSaving = false
    }

    @MainActor
    func updateDisplayName(_ name: String) async {
        isSaving = true
        error = nil
        do {
            let request = ProfileUpdateRequest(
                displayName: name,
                avatar: nil,
                language: nil,
                preferences: nil,
                phoneNumber: nil
            )
            profile = try await repository.updateProfile(request: request)
        } catch {
            self.error = error.localizedDescription
        }
        isSaving = false
    }

    @MainActor
    func updatePhoneNumber(_ phone: String) async {
        isSaving = true
        error = nil
        do {
            let request = ProfileUpdateRequest(
                displayName: nil,
                avatar: nil,
                language: nil,
                preferences: nil,
                phoneNumber: phone
            )
            profile = try await repository.updateProfile(request: request)
        } catch {
            self.error = error.localizedDescription
        }
        isSaving = false
    }
}
