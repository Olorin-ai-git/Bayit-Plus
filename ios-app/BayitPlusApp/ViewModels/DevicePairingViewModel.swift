import Foundation
import Observation

/// ViewModel for device pairing - generates pairing codes, verifies
/// codes from other devices, and manages paired device list.
@MainActor
@Observable
final class DevicePairingViewModel {
    private(set) var pairingCode: PairingCode?
    private(set) var devices: [PairedDevice] = []
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var isGenerating = false
    private(set) var isVerifying = false

    var manualCodeInput = ""

    private let repository: any DevicePairingRepository

    init(repository: any DevicePairingRepository) {
        self.repository = repository
    }

    // MARK: - Data Loading

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            devices = try await repository.listDevices()
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }

    // MARK: - Pairing Code

    @MainActor
    func generateCode() async {
        isGenerating = true
        error = nil

        do {
            pairingCode = try await repository.generateCode()
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isGenerating = false
    }

    @MainActor
    func verifyCode() async {
        let code = manualCodeInput.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !code.isEmpty else { return }

        isVerifying = true
        error = nil

        do {
            let device = try await repository.verifyCode(code: code)
            devices.append(device)
            manualCodeInput = ""
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isVerifying = false
    }

    // MARK: - Device Management

    @MainActor
    func removeDevice(_ device: PairedDevice) async {
        error = nil

        do {
            try await repository.removeDevice(id: device.id)
            devices.removeAll { $0.id == device.id }
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }
    }
}
