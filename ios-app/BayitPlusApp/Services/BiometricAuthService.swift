import Foundation
import LocalAuthentication

/// Provides biometric authentication (Face ID / Touch ID) capabilities.
///
/// This service wraps the `LocalAuthentication` framework to determine
/// the available biometric type and to evaluate biometric policies. It is
/// `Sendable` because `LAContext` instances are created fresh per call.
final class BiometricAuthService: Sendable {

    /// Biometric authentication types supported by the device.
    enum BiometricType: Sendable {
        case faceID
        case touchID
        case none
    }

    // MARK: - Public API

    /// Returns the biometric type available on the current device.
    func biometricType() -> BiometricType {
        let context = LAContext()
        var evaluationError: NSError?
        _ = context.canEvaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            error: &evaluationError
        )

        switch context.biometryType {
        case .faceID:
            return .faceID
        case .touchID:
            return .touchID
        case .opticID:
            return .faceID
        @unknown default:
            return .none
        }
    }

    /// Whether the device supports biometric authentication.
    func isBiometricAvailable() -> Bool {
        let context = LAContext()
        var evaluationError: NSError?
        return context.canEvaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            error: &evaluationError
        )
    }

    /// Authenticates the user via biometrics with the given localized reason.
    ///
    /// - Parameter reason: A localized explanation shown in the system prompt.
    /// - Returns: `true` if authentication succeeded.
    /// - Throws: `LAError` if evaluation fails or the user cancels.
    func authenticate(reason: String) async throws -> Bool {
        let context = LAContext()
        context.localizedCancelTitle = nil
        return try await context.evaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            localizedReason: reason
        )
    }
}
