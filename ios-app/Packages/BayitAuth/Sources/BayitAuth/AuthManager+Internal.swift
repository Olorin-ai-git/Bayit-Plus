import Foundation
import FirebaseAuth

// MARK: - Internal Helpers

extension AuthManager {

    /// Processes a successful Firebase auth result:
    /// 1. Gets the Firebase ID token (for Firebase features)
    /// 2. Exchanges the provider token with the backend for a JWT
    /// 3. Builds the BayitUser from Firebase user data
    func handleFirebaseAuthResult(
        _ result: AuthDataResult,
        providerToken: ProviderToken? = nil
    ) async throws {
        let firebaseUser = result.user

        let tokenResult = try await firebaseUser.getIDTokenResult(forcingRefresh: false)
        let firebaseIDToken = tokenResult.token

        // Cache Firebase ID token (still used for Firebase-specific features)
        try keychainService.save(token: firebaseIDToken, for: tokenKeychainKey)

        // Exchange provider token with backend for a backend-issued JWT
        let backendToken: String
        if let providerToken = providerToken {
            backendToken = try await exchangeForBackendJWT(providerToken: providerToken)
        } else {
            // Fallback: use Firebase ID token directly (email sign-in handled separately)
            backendToken = firebaseIDToken
        }

        let bayitUser = BayitUser(
            id: firebaseUser.uid,
            email: firebaseUser.email ?? "",
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: parseRole(from: tokenResult.claims),
            isActive: true,
            subscription: nil,
            isBetaUser: parseBetaStatus(from: tokenResult.claims),
            isVerified: firebaseUser.isEmailVerified,
            createdAt: nil,
            lastLogin: nil
        )

        // Cache user data in Keychain for offline restoration
        if let userData = try? JSONEncoder().encode(bayitUser) {
            try? keychainService.save(
                token: String(data: userData, encoding: .utf8) ?? "",
                for: userKeychainKey
            )
        }

        user = bayitUser
        token = backendToken
        isLoading = false
    }

    /// Exchanges a provider-specific token with the backend for a JWT.
    func exchangeForBackendJWT(providerToken: ProviderToken) async throws -> String {
        let response: BackendTokenExchangeClient.TokenExchangeResponse

        switch providerToken {
        case .google(let idToken):
            response = try await BackendTokenExchangeClient.exchangeGoogleToken(
                idToken: idToken,
                logger: logger
            )

        case .apple(let identityToken, let fullName, let email):
            response = try await BackendTokenExchangeClient.exchangeAppleToken(
                identityToken: identityToken,
                fullName: fullName,
                email: email,
                logger: logger
            )

        case .emailPassword(let accessToken, let refreshToken):
            // Email sign-in already returns backend tokens directly
            try keychainService.save(
                token: accessToken, for: backendTokenKeychainKey
            )
            if let refresh = refreshToken {
                try keychainService.save(
                    token: refresh, for: refreshTokenKeychainKey
                )
            }
            return accessToken
        }

        // Store backend JWT and refresh token
        try keychainService.save(
            token: response.accessToken, for: backendTokenKeychainKey
        )
        if let refreshToken = response.refreshToken {
            try keychainService.save(
                token: refreshToken, for: refreshTokenKeychainKey
            )
        }

        return response.accessToken
    }

    /// Parses the user role from Firebase custom claims.
    func parseRole(from claims: [String: Any]) -> UserRole {
        guard let roleString = claims["role"] as? String,
              let role = UserRole(rawValue: roleString) else {
            return .user
        }
        return role
    }

    /// Parses beta user status from Firebase custom claims.
    func parseBetaStatus(from claims: [String: Any]) -> Bool {
        claims["is_beta_user"] as? Bool ?? false
    }

    /// Restores a cached session from Keychain on launch.
    func restoreCachedSession() {
        if let userJSON = try? keychainService.load(for: userKeychainKey),
           let userData = userJSON.data(using: .utf8),
           let cachedUser = try? JSONDecoder().decode(BayitUser.self, from: userData) {
            user = cachedUser
        }

        // Prefer backend JWT over Firebase ID token
        if let backendJWT = try? keychainService.load(for: backendTokenKeychainKey) {
            token = backendJWT
        } else if let cachedToken = try? keychainService.load(for: tokenKeychainKey) {
            token = cachedToken
        }
    }

    /// Listens for Firebase auth state changes to keep local state in sync.
    func listenForAuthStateChanges() {
        authStateHandle = Auth.auth().addStateDidChangeListener { [weak self] _, firebaseUser in
            guard let self else { return }

            if firebaseUser == nil {
                self.clearState()
                try? self.keychainService.delete(for: self.tokenKeychainKey)
                try? self.keychainService.delete(for: self.backendTokenKeychainKey)
                try? self.keychainService.delete(for: self.refreshTokenKeychainKey)
                try? self.keychainService.delete(for: self.userKeychainKey)
            }
        }
    }
}

/// Represents the provider-specific token to exchange with the backend.
enum ProviderToken {
    case google(idToken: String)
    case apple(identityToken: String, fullName: String?, email: String?)
    case emailPassword(accessToken: String, refreshToken: String?)
}
