import AuthenticationServices
import Foundation

/// Helper class for passkey (WebAuthn) authentication on iOS/tvOS.
///
/// Uses ASAuthorizationController with ASAuthorizationPlatformPublicKeyCredentialProvider
/// for FIDO2/WebAuthn passkey authentication.
///
/// Available on iOS 16+ and tvOS 16+.
@available(iOS 16.0, tvOS 16.0, *)
final class PasskeyHelper: NSObject {

    private var continuation: CheckedContinuation<ASAuthorizationPlatformPublicKeyCredentialAssertion, Error>?

    /// Authenticates the user with a passkey (WebAuthn credential).
    ///
    /// On tvOS, this will prompt the user to authenticate using:
    /// - A passkey stored on their Apple TV (via iCloud Keychain)
    /// - A passkey on their nearby iPhone/iPad (proximity auth)
    ///
    /// - Parameter challenge: The WebAuthn challenge from the backend
    /// - Parameter relyingPartyIdentifier: The domain (e.g., "bayit.tv")
    /// - Returns: The credential assertion containing the signed challenge
    func authenticate(
        challenge: Data,
        relyingPartyIdentifier: String
    ) async throws -> ASAuthorizationPlatformPublicKeyCredentialAssertion {
        return try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation

            let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(
                relyingPartyIdentifier: relyingPartyIdentifier
            )

            let assertionRequest = provider.createCredentialAssertionRequest(
                challenge: challenge
            )

            let controller = ASAuthorizationController(
                authorizationRequests: [assertionRequest]
            )
            controller.delegate = self

            // Perform requests on main thread (required for UI presentation)
            DispatchQueue.main.async {
                #if os(iOS)
                // iOS requires a presentation context provider
                if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                   !windowScene.windows.isEmpty {
                    controller.presentationContextProvider = self
                }
                #endif
                controller.performRequests()
            }
        }
    }
}

// MARK: - ASAuthorizationControllerDelegate

@available(iOS 16.0, tvOS 16.0, *)
extension PasskeyHelper: ASAuthorizationControllerDelegate {

    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        if let credential = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialAssertion {
            continuation?.resume(returning: credential)
            continuation = nil
        } else {
            continuation?.resume(throwing: NSError(
                domain: "PasskeyHelper",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Invalid credential type"]
            ))
            continuation = nil
        }
    }

    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        continuation?.resume(throwing: error)
        continuation = nil
    }
}

// MARK: - ASAuthorizationControllerPresentationContextProviding (iOS only)

#if os(iOS)
@available(iOS 16.0, *)
extension PasskeyHelper: ASAuthorizationControllerPresentationContextProviding {
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first else {
            fatalError("No window available for passkey presentation")
        }
        return window
    }
}
#endif
