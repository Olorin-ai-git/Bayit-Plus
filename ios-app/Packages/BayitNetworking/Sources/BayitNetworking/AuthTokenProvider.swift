import Foundation

/// Protocol for providing the current authentication token.
///
/// The host app implements this -- typically reading a Firebase ID token
/// from the Keychain -- so the networking layer never depends on a
/// specific auth SDK.
public protocol AuthTokenProvider: Sendable {

    /// Returns the current Bearer token, or `nil` if the user is not authenticated.
    ///
    /// Implementations should refresh expired tokens before returning.
    /// Throwing indicates a transient failure (Keychain unavailable, network error
    /// during refresh). A `nil` return means "unauthenticated on purpose".
    func currentToken() async throws -> String?
}
