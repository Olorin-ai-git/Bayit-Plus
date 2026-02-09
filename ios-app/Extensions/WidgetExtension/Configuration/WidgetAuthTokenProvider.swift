import Foundation
import BayitWidgetShared

/// Provides authentication tokens for widget API calls.
///
/// Reads the token from the shared Keychain written by the main app.
/// Widgets needing authenticated requests call `authToken()` before
/// building their URLRequest.
enum WidgetAuthTokenProvider {

    private static let keychainHelper = SharedKeychainHelper()

    /// Returns the current auth token, or `nil` if the user is not signed in.
    static func authToken() -> String? {
        keychainHelper.readAuthToken()
    }
}
