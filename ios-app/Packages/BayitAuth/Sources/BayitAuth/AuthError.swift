import Foundation

/// Errors originating from the authentication layer.
public enum AuthError: LocalizedError, Sendable {
    case notAuthenticated
    case tokenRefreshFailed(underlying: String)
    case googleSignInFailed(underlying: String)
    case appleSignInFailed(underlying: String)
    case emailSignInFailed(underlying: String)
    case passkeySignInFailed(underlying: String)
    case keychainSaveFailed(status: OSStatus)
    case keychainLoadFailed(status: OSStatus)
    case keychainDeleteFailed(status: OSStatus)
    case keychainItemNotFound
    case profileSelectionFailed(underlying: String)
    case profileLoadFailed(underlying: String)
    case profileCreateFailed(underlying: String)
    case betaCreditsFetchFailed(underlying: String)
    case invalidFirebaseUser
    case missingIDToken
    case signOutFailed(underlying: String)
    case cancelled
    case devicePairingFailed(underlying: String)
    case sessionExpired
    case invalidEmailFormat
    case linkedProvidersFetchFailed(underlying: String)
    case linkProviderFailed(underlying: String)
    case unlinkProviderFailed(underlying: String)
    case providerAlreadyLinked(underlying: String)
    case networkError(underlying: String)
    case passwordResetFailed(underlying: String)

    /// User-facing message suitable for display in the UI.
    /// Avoids exposing technical details.
    public var userFacingMessage: String {
        switch self {
        case .notAuthenticated:
            return "Please sign in to continue"
        case .tokenRefreshFailed:
            return "Session expired. Please sign in again."
        case .googleSignInFailed:
            return "Google sign-in failed. Please try again."
        case .appleSignInFailed:
            return "Apple sign-in failed. Please try again."
        case .emailSignInFailed:
            return "Invalid email or password"
        case .passkeySignInFailed:
            return "Passkey sign-in failed. Please try again."
        case .keychainSaveFailed, .keychainLoadFailed, .keychainDeleteFailed, .keychainItemNotFound:
            return "An unexpected error occurred"
        case .profileSelectionFailed:
            return "Could not select profile. Please try again."
        case .profileLoadFailed:
            return "Could not load profiles. Please try again."
        case .profileCreateFailed:
            return "Could not create profile. Please try again."
        case .betaCreditsFetchFailed:
            return "Could not load beta credits"
        case .invalidFirebaseUser, .missingIDToken:
            return "Authentication error. Please sign in again."
        case .signOutFailed:
            return "Could not sign out. Please try again."
        case .cancelled:
            return "Sign-in was cancelled"
        case .devicePairingFailed:
            return "Device pairing failed. Please try again."
        case .sessionExpired:
            return "Your session has expired. Please sign in again."
        case .invalidEmailFormat:
            return "Please enter a valid email address"
        case .linkedProvidersFetchFailed:
            return "Could not load linked accounts"
        case .linkProviderFailed:
            return "Could not link account. Please try again."
        case .unlinkProviderFailed:
            return "Could not unlink account. You must keep at least one sign-in method."
        case .providerAlreadyLinked:
            return "This account is already linked to another user"
        case .networkError:
            return "Network error. Please check your connection."
        case .passwordResetFailed:
            return "Password reset failed. Please try again."
        }
    }

    public var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "User is not authenticated"
        case .tokenRefreshFailed(let underlying):
            return "Token refresh failed: \(underlying)"
        case .googleSignInFailed(let underlying):
            return "Google sign-in failed: \(underlying)"
        case .appleSignInFailed(let underlying):
            return "Apple sign-in failed: \(underlying)"
        case .emailSignInFailed(let underlying):
            return "Email sign-in failed: \(underlying)"
        case .passkeySignInFailed(let underlying):
            return "Passkey sign-in failed: \(underlying)"
        case .keychainSaveFailed(let status):
            return "Keychain save failed with status: \(status)"
        case .keychainLoadFailed(let status):
            return "Keychain load failed with status: \(status)"
        case .keychainDeleteFailed(let status):
            return "Keychain delete failed with status: \(status)"
        case .keychainItemNotFound:
            return "Keychain item not found"
        case .profileSelectionFailed(let underlying):
            return "Profile selection failed: \(underlying)"
        case .profileLoadFailed(let underlying):
            return "Profile load failed: \(underlying)"
        case .profileCreateFailed(let underlying):
            return "Profile creation failed: \(underlying)"
        case .betaCreditsFetchFailed(let underlying):
            return "Beta credits fetch failed: \(underlying)"
        case .invalidFirebaseUser:
            return "Firebase user is invalid or missing"
        case .missingIDToken:
            return "Firebase ID token is missing"
        case .signOutFailed(let underlying):
            return "Sign-out failed: \(underlying)"
        case .cancelled:
            return "Authentication was cancelled"
        case .devicePairingFailed(let underlying):
            return "Device pairing failed: \(underlying)"
        case .sessionExpired:
            return "Session has expired"
        case .invalidEmailFormat:
            return "Invalid email format"
        case .linkedProvidersFetchFailed(let underlying):
            return "Linked providers fetch failed: \(underlying)"
        case .linkProviderFailed(let underlying):
            return "Link provider failed: \(underlying)"
        case .unlinkProviderFailed(let underlying):
            return "Unlink provider failed: \(underlying)"
        case .providerAlreadyLinked(let underlying):
            return "Provider already linked: \(underlying)"
        case .networkError(let underlying):
            return "Network error: \(underlying)"
        case .passwordResetFailed(let underlying):
            return "Password reset failed: \(underlying)"
        }
    }
}
