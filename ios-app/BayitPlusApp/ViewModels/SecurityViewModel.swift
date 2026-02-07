import Foundation
import Observation

/// ViewModel for the Security screen - manages devices, password, and
/// account security state.
@Observable
final class SecurityViewModel {
    private(set) var devices: [DeviceInfo] = []
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var isProcessing = false
    private(set) var successMessage: String?

    var currentPassword = ""
    var newPassword = ""
    var confirmPassword = ""

    private let repository: any SettingsRepository

    init(repository: any SettingsRepository) {
        self.repository = repository
    }

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let response = try await repository.fetchDevices()
            devices = response.devices
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func changePassword() async {
        guard !newPassword.isEmpty else {
            error = "Password cannot be empty"
            return
        }
        guard newPassword == confirmPassword else {
            error = "Passwords do not match"
            return
        }

        isProcessing = true
        error = nil
        successMessage = nil

        do {
            let request = ChangePasswordRequest(
                currentPassword: currentPassword,
                newPassword: newPassword
            )
            let response = try await repository.changePassword(request: request)
            successMessage = response.message ?? "Password changed successfully"
            currentPassword = ""
            newPassword = ""
            confirmPassword = ""
        } catch {
            self.error = error.localizedDescription
        }

        isProcessing = false
    }

    @MainActor
    func removeDevice(_ device: DeviceInfo) async {
        isProcessing = true
        error = nil

        do {
            _ = try await repository.removeDevice(deviceId: device.id)
            devices.removeAll { $0.id == device.id }
        } catch {
            self.error = error.localizedDescription
        }

        isProcessing = false
    }

    var passwordsValid: Bool {
        !currentPassword.isEmpty &&
        !newPassword.isEmpty &&
        newPassword == confirmPassword &&
        newPassword.count >= 8
    }
}
