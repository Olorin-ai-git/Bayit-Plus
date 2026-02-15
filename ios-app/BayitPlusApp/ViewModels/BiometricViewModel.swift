#if os(iOS)
import Foundation
import Observation
import UIKit

/// ViewModel for biometric (Face ID / Touch ID) authentication UI.
///
/// Coordinates between the on-device `BiometricAuthService` for local
/// biometric evaluation and the `SecurityRepository` for persisting
/// the biometric preference on the backend.
///
/// Available on iOS only. tvOS does not support biometric authentication.
@MainActor
@Observable
final class BiometricViewModel {
    private(set) var biometricType: BiometricAuthService.BiometricType = .none
    private(set) var isBiometricAvailable = false
    private(set) var isBiometricEnabled = false
    private(set) var isAuthenticating = false
    private(set) var isProcessing = false
    private(set) var error: String?
    private(set) var isAuthenticated = false

    private let biometricService: BiometricAuthService
    private let securityRepository: any SecurityRepository

    init(
        biometricService: BiometricAuthService = BiometricAuthService(),
        securityRepository: any SecurityRepository
    ) {
        self.biometricService = biometricService
        self.securityRepository = securityRepository
    }

    // MARK: - Computed

    /// SF Symbol name for the current biometric type.
    var biometricIconName: String {
        switch biometricType {
        case .faceID: return "faceid"
        case .touchID: return "touchid"
        case .none: return "lock.shield"
        }
    }

    /// Display label for the current biometric type.
    var biometricLabel: String {
        switch biometricType {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        case .none: return "Biometric"
        }
    }

    // MARK: - Actions

    @MainActor
    func load() async {
        biometricType = biometricService.biometricType()
        isBiometricAvailable = biometricService.isBiometricAvailable()

        do {
            let settings = try await securityRepository.fetchSettings()
            isBiometricEnabled = settings.biometricEnabled ?? false
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }
    }

    @MainActor
    func authenticate(reason: String) async {
        guard !isAuthenticating else { return }
        isAuthenticating = true
        error = nil

        do {
            let success = try await biometricService.authenticate(reason: reason)
            isAuthenticated = success
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        }

        isAuthenticating = false
    }

    @MainActor
    func toggleBiometric() async {
        isProcessing = true
        error = nil

        do {
            if isBiometricEnabled {
                try await securityRepository.disableBiometric()
                isBiometricEnabled = false
            } else {
                let success = try await biometricService.authenticate(
                    reason: "Enable biometric authentication"
                )
                if success {
                    try await securityRepository.enableBiometric()
                    isBiometricEnabled = true
                }
            }
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isProcessing = false
    }
}
#endif
