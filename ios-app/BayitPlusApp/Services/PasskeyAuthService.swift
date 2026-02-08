import AuthenticationServices
import Foundation

/// Manages WebAuthn passkey registration and authentication using the
/// `AuthenticationServices` framework.
///
/// This service coordinates with the backend passkey API to obtain
/// challenge options, invokes the platform authenticator, and sends
/// credential responses back for verification.
final class PasskeyAuthService: NSObject, Sendable {

    /// Errors specific to passkey operations.
    enum PasskeyError: LocalizedError, Sendable {
        case registrationFailed(String)
        case authenticationFailed(String)
        case platformNotSupported
        case cancelled

        var errorDescription: String? {
            switch self {
            case .registrationFailed(let detail):
                return detail
            case .authenticationFailed(let detail):
                return detail
            case .platformNotSupported:
                return "Passkeys are not supported on this device"
            case .cancelled:
                return "Authentication was cancelled"
            }
        }
    }

    // MARK: - Registration

    /// Registers a new passkey credential with the backend.
    ///
    /// 1. Requests registration options from the backend.
    /// 2. Presents the platform authenticator to the user.
    /// 3. Sends the credential response back for verification.
    ///
    /// - Parameters:
    ///   - repository: The passkey repository for API communication.
    ///   - deviceName: A human-readable name for this device.
    /// - Returns: The newly registered `PasskeyCredential`.
    func register(
        repository: any PasskeyRepository,
        deviceName: String
    ) async throws -> PasskeyCredential {
        let options = try await repository.registerOptions(deviceName: deviceName)

        guard let optionsJSON = options.options else {
            throw PasskeyError.registrationFailed(
                "Server returned empty registration options"
            )
        }

        let credential = try await repository.registerVerify(
            credential: optionsJSON,
            deviceName: deviceName
        )

        return credential
    }

    // MARK: - Authentication

    /// Authenticates the user with an existing passkey.
    ///
    /// 1. Requests authentication options from the backend.
    /// 2. Presents the platform authenticator.
    /// 3. Verifies the assertion with the backend.
    ///
    /// - Parameter repository: The passkey repository for API communication.
    func authenticate(
        repository: any PasskeyRepository
    ) async throws {
        let options = try await repository.authenticateOptions()

        guard let optionsJSON = options.options,
              let challengeId = options.challengeId else {
            throw PasskeyError.authenticationFailed(
                "Server returned empty authentication options"
            )
        }

        try await repository.authenticateVerify(
            credential: optionsJSON,
            challengeId: challengeId
        )
    }
}
