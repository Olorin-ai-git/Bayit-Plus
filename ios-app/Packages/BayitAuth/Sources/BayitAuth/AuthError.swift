import Foundation

/// Errors originating from the authentication layer.
public enum AuthError: LocalizedError, Sendable {
    case notAuthenticated
    case tokenRefreshFailed(underlying: String)
    case googleSignInFailed(underlying: String)
    case appleSignInFailed(underlying: String)
    case emailSignInFailed(underlying: String)
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
        }
    }
}
