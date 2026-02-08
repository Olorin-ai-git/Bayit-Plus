import Foundation
import Observation
import UIKit

/// ViewModel for passkey management (registration, listing, deletion).
///
/// Uses the `PasskeyAuthService` for WebAuthn operations and the
/// `PasskeyRepository` for backend CRUD operations on credentials.
@Observable
final class PasskeyViewModel {
    private(set) var credentials: [PasskeyCredential] = []
    private(set) var isLoading = false
    private(set) var isRegistering = false
    private(set) var isDeleting = false
    private(set) var error: String?
    private(set) var successMessage: String?

    private let repository: any PasskeyRepository
    private let passkeyService: PasskeyAuthService

    init(
        repository: any PasskeyRepository,
        passkeyService: PasskeyAuthService = PasskeyAuthService()
    ) {
        self.repository = repository
        self.passkeyService = passkeyService
    }

    // MARK: - Load

    @MainActor
    func loadCredentials() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            credentials = try await repository.listCredentials()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Register

    @MainActor
    func registerPasskey(deviceName: String) async {
        guard !isRegistering else { return }
        isRegistering = true
        error = nil
        successMessage = nil

        do {
            let credential = try await passkeyService.register(
                repository: repository,
                deviceName: deviceName
            )
            credentials.append(credential)
            successMessage = "Passkey registered"
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        } catch {
            self.error = error.localizedDescription
            UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        }

        isRegistering = false
    }

    // MARK: - Delete

    @MainActor
    func deleteCredential(_ credential: PasskeyCredential) async {
        isDeleting = true
        error = nil
        successMessage = nil

        do {
            try await repository.deleteCredential(id: credential.id)
            credentials.removeAll { $0.id == credential.id }
            successMessage = "Passkey removed"
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        } catch {
            self.error = error.localizedDescription
        }

        isDeleting = false
    }
}
