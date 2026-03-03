import Foundation
import LocalAuthentication

public final class BiometricAuthService: Sendable {
    public enum BiometricType: Sendable {
        case faceID
        case touchID
        case none
    }

    public init() {}

    public func biometricType() -> BiometricType {
        let context = LAContext()
        var error: NSError?
        _ = context.canEvaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            error: &error
        )

        switch context.biometryType {
        case .faceID:
            return .faceID
        case .touchID:
            return .touchID
        case .opticID:
            return .faceID
        case .none:
            return .none
        @unknown default:
            return .none
        }
    }

    public func isBiometricAvailable() -> Bool {
        let context = LAContext()
        var error: NSError?
        return context.canEvaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            error: &error
        )
    }

    public func authenticate(reason: String) async throws -> Bool {
        let context = LAContext()
        context.localizedCancelTitle = nil
        return try await context.evaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            localizedReason: reason
        )
    }
}
