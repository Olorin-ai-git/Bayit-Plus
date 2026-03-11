import BayitCore
import FirebaseAuth
import FirebaseCore
import Foundation

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

        // Fetch full user profile from backend for authoritative role/subscription data.
        // Firebase claims may not include custom role, so backend is the source of truth.
        let bayitUser: BayitUser
        do {
            bayitUser = try await fetchUserProfile(token: backendToken)
        } catch {
            logger.warning(
                "Backend profile fetch failed, using Firebase claims",
                metadata: ["error": error.localizedDescription]
            )
            bayitUser = BayitUser(
                id: firebaseUser.uid,
                email: firebaseUser.email ?? "",
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                role: parseRole(from: tokenResult.claims),
                isActive: true,
                subscription: nil,
                isVerified: firebaseUser.isEmailVerified,
                createdAt: nil,
                lastLogin: nil
            )
        }

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

        stampSessionTimestamp()
    }

    /// Exchanges a provider-specific token with the backend for a JWT.
    func exchangeForBackendJWT(providerToken: ProviderToken) async throws -> String {
        switch providerToken {
        case let .google(idToken):
            let response = try await BackendTokenExchangeClient.loginWithGoogle(
                idToken: idToken,
                logger: logger
            )
            try keychainService.save(
                token: response.accessToken, for: backendTokenKeychainKey
            )
            if let refreshToken = response.refreshToken {
                try keychainService.save(
                    token: refreshToken, for: refreshTokenKeychainKey
                )
            }
            return response.accessToken

        case let .apple(identityToken, fullName, email):
            let response = try await BackendTokenExchangeClient.loginWithApple(
                idToken: identityToken,
                fullName: fullName,
                email: email,
                logger: logger
            )
            try keychainService.save(
                token: response.accessToken, for: backendTokenKeychainKey
            )
            if let refreshToken = response.refreshToken {
                try keychainService.save(
                    token: refreshToken, for: refreshTokenKeychainKey
                )
            }
            return response.accessToken

        case let .emailPassword(accessToken, refreshToken):
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
    }

    /// Parses the user role from Firebase custom claims.
    func parseRole(from claims: [String: Any]) -> UserRole {
        guard let roleString = claims["role"] as? String,
              let role = UserRole(rawValue: roleString)
        else {
            return .user
        }
        return role
    }

    /// Restores a cached session from Keychain on launch.
    /// Checks session expiry and clears state if the session is too old.
    /// Attempts to refresh expired tokens before clearing credentials.
    func restoreCachedSession() {
        logger.debug("Restoring cached session", metadata: [:])

        guard !isSessionExpired else {
            logger.info(
                "Cached session expired, clearing credentials",
                metadata: [
                    "max_age_days": String(sessionMaxAgeDays),
                ]
            )
            clearKeychainAndState()
            return
        }

        // Load backend JWT and validate it's not expired
        if let backendJWT = try? keychainService.load(for: backendTokenKeychainKey) {
            logger.debug("Found backend JWT in keychain", metadata: [:])
            if isJWTExpiredOrExpiringSoon(backendJWT) {
                logger.info(
                    "Cached backend JWT expired or expiring soon, attempting refresh",
                    metadata: [:]
                )
                attemptTokenRefreshSync()
                return
            }
            logger.debug("Backend JWT is valid, restoring session", metadata: [:])
            token = backendJWT
        } else if let cachedToken = try? keychainService.load(for: tokenKeychainKey) {
            logger.debug("Found Firebase token in keychain", metadata: [:])
            if isJWTExpiredOrExpiringSoon(cachedToken) {
                logger.info(
                    "Cached Firebase token expired or expiring soon, attempting refresh",
                    metadata: [:]
                )
                attemptTokenRefreshSync()
                return
            }
            logger.debug("Firebase token is valid, restoring session", metadata: [:])
            token = cachedToken
        } else {
            logger.debug("No cached tokens found in keychain", metadata: [:])
        }

        // Only restore user if we have a valid token
        if token != nil,
           let userJSON = try? keychainService.load(for: userKeychainKey),
           let userData = userJSON.data(using: .utf8),
           let cachedUser = try? JSONDecoder().decode(BayitUser.self, from: userData)
        {
            user = cachedUser
            logger.debug("Session restored successfully", metadata: ["user_id": cachedUser.id])
        }
    }

    /// Attempts to refresh the access token using the stored refresh token.
    /// Clears credentials if refresh fails or no refresh token exists.
    /// Must be called synchronously during init, spawns a Task internally.
    private func attemptTokenRefreshSync() {
        guard let refreshToken = try? keychainService.load(for: refreshTokenKeychainKey) else {
            logger.warning(
                "No refresh token available, clearing credentials",
                metadata: [:]
            )
            clearKeychainAndState()
            return
        }

        logger.info("Attempting to refresh access token", metadata: [:])

        // Spawn async task to refresh token
        Task { @MainActor in
            do {
                let response = try await BackendTokenExchangeClient.refreshAccessToken(
                    refreshToken: refreshToken,
                    logger: logger
                )

                try keychainService.save(
                    token: response.accessToken,
                    for: backendTokenKeychainKey
                )
                if let rotatedRefresh = response.refreshToken {
                    try keychainService.save(
                        token: rotatedRefresh,
                        for: refreshTokenKeychainKey
                    )
                    onRefreshTokenRotated?(rotatedRefresh)
                }

                let bayitUser = try await fetchUserProfile(token: response.accessToken)

                if let userData = try? JSONEncoder().encode(bayitUser) {
                    try? keychainService.save(
                        token: String(data: userData, encoding: .utf8) ?? "",
                        for: userKeychainKey
                    )
                }

                user = bayitUser
                token = response.accessToken
                stampSessionTimestamp()

                logger.info(
                    "Token refresh succeeded, session restored",
                    metadata: ["user_id": bayitUser.id]
                )
            } catch {
                logger.error(
                    "Token refresh failed, clearing access tokens",
                    metadata: ["error": error.localizedDescription]
                )
                clearAccessTokensAndState()
            }
        }
    }

    /// Checks if a JWT token is expired or will expire within 5 minutes.
    private func isJWTExpiredOrExpiringSoon(_ token: String) -> Bool {
        let segments = token.split(separator: ".")
        guard segments.count == 3 else { return true }

        let payloadSegment = String(segments[1])

        // Base64URL decode
        var base64 = payloadSegment
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        let remainder = base64.count % 4
        if remainder > 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }

        guard let data = Data(base64Encoded: base64) else { return true }

        struct JWTPayload: Decodable {
            let exp: TimeInterval?
        }

        guard let payload = try? JSONDecoder().decode(JWTPayload.self, from: data),
              let expiration = payload.exp
        else {
            return true
        }

        let expirationDate = Date(timeIntervalSince1970: expiration)
        let fiveMinutes: TimeInterval = 5 * 60
        return expirationDate.timeIntervalSinceNow < fiveMinutes
    }

    /// Clears all Keychain entries and local state.
    private func clearKeychainAndState() {
        clearState()
        try? keychainService.delete(for: tokenKeychainKey)
        try? keychainService.delete(for: backendTokenKeychainKey)
        try? keychainService.delete(for: refreshTokenKeychainKey)
        try? keychainService.delete(for: userKeychainKey)
        try? keychainService.delete(for: sessionTimestampKeychainKey)
    }

    /// Clears access tokens and local state but preserves the refresh
    /// token so biometric re-authentication remains available.
    private func clearAccessTokensAndState() {
        clearState()
        try? keychainService.delete(for: tokenKeychainKey)
        try? keychainService.delete(for: backendTokenKeychainKey)
        try? keychainService.delete(for: userKeychainKey)
    }

    /// Listens for Firebase auth state changes to keep local state in sync.
    ///
    /// Only clears credentials when a previously-known Firebase user disappears
    /// (genuine sign-out or server-side revocation). Does not clear when Firebase
    /// has never had a user — which is the normal state for email, passkey,
    /// biometric, and device-pairing sign-in methods.
    func listenForAuthStateChanges() {
        guard FirebaseApp.app() != nil else { return }

        var hadFirebaseUser = Auth.auth().currentUser != nil

        authStateHandle = Auth.auth().addStateDidChangeListener { [weak self] _, firebaseUser in
            guard let self else { return }

            if firebaseUser != nil {
                hadFirebaseUser = true
            } else if hadFirebaseUser {
                hadFirebaseUser = false
                self.clearAccessTokensAndState()
            }
        }
    }

    /// Fetches user profile from the backend using a backend JWT.
    ///
    /// Used for authentication flows that bypass Firebase (e.g., passkey sign-in).
    func fetchUserProfile(token: String) async throws -> BayitUser {
        let config = AppConfiguration()
        let url = config.apiBaseURL.appendingPathComponent("auth/me")

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = config.apiTimeout

        logger.debug("Fetching user profile from backend", metadata: [:])

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.notAuthenticated
        }

        guard httpResponse.statusCode == 200 else {
            throw AuthError.notAuthenticated
        }

        let userResponse = try JSONDecoder().decode(BackendUserResponse.self, from: data)

        return BayitUser(
            id: userResponse.id,
            email: userResponse.email,
            displayName: userResponse.name,
            photoURL: userResponse.avatar != nil ? URL(string: userResponse.avatar!) : nil,
            role: UserRole(rawValue: userResponse.role) ?? .user,
            isActive: userResponse.isActive,
            subscription: nil,
            isVerified: userResponse.isVerified ?? false,
            createdAt: nil,
            lastLogin: nil
        )
    }
}

/// Backend user profile response model.
private struct BackendUserResponse: Decodable {
    let id: String
    let email: String
    let name: String
    let role: String
    let isActive: Bool
    let isVerified: Bool?
    let avatar: String?

    private enum CodingKeys: String, CodingKey {
        case id
        case email
        case name
        case role
        case isActive = "is_active"
        case isVerified = "is_verified"
        case avatar
    }
}

/// Represents the provider-specific token to exchange with the backend.
enum ProviderToken {
    case google(idToken: String)
    case apple(identityToken: String, fullName: String?, email: String?)
    case emailPassword(accessToken: String, refreshToken: String?)
}
