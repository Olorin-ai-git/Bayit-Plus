import Foundation

/// Errors originating from the authentication layer.
public enum AuthError: LocalizedError, Sendable {
    case notAuthenticated
    case tokenRefreshFailed(underlying: String)
    case googleSignInFailed(underlying: String)
    case appleSignInFailed(underlying: String)
    case emailSignInFailed(underlying: String)
    case registrationFailed(underlying: String)
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
    case endpointDeprecated(message: String)
    case biometricAuthFailed(underlying: String)

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
        case .registrationFailed:
            return "Registration failed. Please try again."
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
        case .endpointDeprecated:
            return "Please update your app. Your session has expired."
        case .biometricAuthFailed:
            return "Biometric authentication failed. Please try another sign-in method."
        }
    }

    public var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "User is not authenticated"
        case let .tokenRefreshFailed(underlying):
            return "Token refresh failed: \(underlying)"
        case let .googleSignInFailed(underlying):
            return "Google sign-in failed: \(underlying)"
        case let .appleSignInFailed(underlying):
            return "Apple sign-in failed: \(underlying)"
        case let .emailSignInFailed(underlying):
            return "Email sign-in failed: \(underlying)"
        case let .registrationFailed(underlying):
            return "Registration failed: \(underlying)"
        case let .keychainSaveFailed(status):
            return "Keychain save failed with status: \(status)"
        case let .keychainLoadFailed(status):
            return "Keychain load failed with status: \(status)"
        case let .keychainDeleteFailed(status):
            return "Keychain delete failed with status: \(status)"
        case .keychainItemNotFound:
            return "Keychain item not found"
        case let .profileSelectionFailed(underlying):
            return "Profile selection failed: \(underlying)"
        case let .profileLoadFailed(underlying):
            return "Profile load failed: \(underlying)"
        case let .profileCreateFailed(underlying):
            return "Profile creation failed: \(underlying)"
        case let .betaCreditsFetchFailed(underlying):
            return "Beta credits fetch failed: \(underlying)"
        case .invalidFirebaseUser:
            return "Firebase user is invalid or missing"
        case .missingIDToken:
            return "Firebase ID token is missing"
        case let .signOutFailed(underlying):
            return "Sign-out failed: \(underlying)"
        case .cancelled:
            return "Authentication was cancelled"
        case let .devicePairingFailed(underlying):
            return "Device pairing failed: \(underlying)"
        case .sessionExpired:
            return "Session has expired"
        case .invalidEmailFormat:
            return "Invalid email format"
        case let .linkedProvidersFetchFailed(underlying):
            return "Linked providers fetch failed: \(underlying)"
        case let .linkProviderFailed(underlying):
            return "Link provider failed: \(underlying)"
        case let .unlinkProviderFailed(underlying):
            return "Unlink provider failed: \(underlying)"
        case let .providerAlreadyLinked(underlying):
            return "Provider already linked: \(underlying)"
        case let .networkError(underlying):
            return "Network error: \(underlying)"
        case let .passwordResetFailed(underlying):
            return "Password reset failed: \(underlying)"
        case let .endpointDeprecated(message):
            return "Endpoint deprecated: \(message). Please update your app."
        case let .biometricAuthFailed(underlying):
            return "Biometric auth failed: \(underlying)"
        }
    }
}
