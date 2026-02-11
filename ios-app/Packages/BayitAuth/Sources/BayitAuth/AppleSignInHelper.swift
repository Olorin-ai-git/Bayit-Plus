import AuthenticationServices
import CryptoKit
import Foundation

/// Result of an Apple Sign-In authorization containing the credential and nonce.
struct AppleSignInResult {
    let credential: ASAuthorizationCredential
    let nonce: String
}

/// Performs Apple Sign-In using `ASAuthorizationController` bridged to async/await.
///
/// Generates a cryptographic nonce for Firebase Auth replay protection.
extension AuthManager {

    func performAppleSignIn() async throws -> AppleSignInResult {
        let nonce = generateNonce()
        let hashedNonce = sha256(nonce)

        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = hashedNonce

        return try await withCheckedThrowingContinuation { continuation in
            let delegate = AppleSignInDelegate(continuation: continuation, nonce: nonce)

            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = delegate

            // Keep delegate alive for the duration of the flow
            objc_setAssociatedObject(
                controller,
                &AssociatedKeys.delegateKey,
                delegate,
                .OBJC_ASSOCIATION_RETAIN
            )

            controller.performRequests()
        }
    }

    /// Generates a cryptographically random nonce string.
    private func generateNonce(length: Int = 32) -> String {
        precondition(length > 0)
        var randomBytes = [UInt8](repeating: 0, count: length)
        let status = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
        precondition(status == errSecSuccess, "Failed to generate random bytes")

        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        return String(randomBytes.map { byte in
            charset[Int(byte) % charset.count]
        })
    }

    /// SHA-256 hash of the input string, returned as a hex string.
    private func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = SHA256.hash(data: inputData)
        return hashedData.compactMap { String(format: "%02x", $0) }.joined()
    }
}

// MARK: - Associated Object Key

private enum AssociatedKeys {
    static var delegateKey: UInt8 = 0
}

// MARK: - ASAuthorizationControllerDelegate Bridge

/// Bridges the delegate callback pattern to a Swift concurrency continuation.
private final class AppleSignInDelegate: NSObject, ASAuthorizationControllerDelegate, @unchecked Sendable {

    private let continuation: CheckedContinuation<AppleSignInResult, Error>
    private let nonce: String

    nonisolated init(
        continuation: CheckedContinuation<AppleSignInResult, Error>,
        nonce: String
    ) {
        self.continuation = continuation
        self.nonce = nonce
    }

    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        let result = AppleSignInResult(credential: authorization.credential, nonce: nonce)
        continuation.resume(returning: result)
    }

    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        if let asError = error as? ASAuthorizationError, asError.code == .canceled {
            continuation.resume(throwing: AuthError.cancelled)
        } else {
            continuation.resume(throwing: AuthError.appleSignInFailed(underlying: error.localizedDescription))
        }
    }
}

