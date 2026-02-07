import Foundation
import FirebaseAuth

// MARK: - Internal Helpers

extension AuthManager {

    /// Processes a successful Firebase auth result:
    /// 1. Gets the ID token
    /// 2. Saves to Keychain
    /// 3. Builds the BayitUser from Firebase user data
    func handleFirebaseAuthResult(_ result: AuthDataResult) async throws {
        let firebaseUser = result.user

        let tokenResult = try await firebaseUser.getIDTokenResult(forcingRefresh: false)
        let idToken = tokenResult.token

        try keychainService.save(token: idToken, for: tokenKeychainKey)

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
        token = idToken
        isLoading = false
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

        if let cachedToken = try? keychainService.load(for: tokenKeychainKey) {
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
                try? self.keychainService.delete(for: self.userKeychainKey)
            }
        }
    }
}
