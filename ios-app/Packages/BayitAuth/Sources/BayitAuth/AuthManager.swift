import Foundation
import UIKit
import FirebaseAuth
import GoogleSignIn
import BayitCore
import BayitNetworking

/// Central authentication manager for the Bayit+ iOS app.
///
/// Uses iOS 17 `@Observable` macro for reactive SwiftUI binding.
/// Integrates Firebase Auth for identity, Keychain for token persistence,
/// and the backend API for user data and beta credits.
///
/// Mirrors the state shape from `shared/stores/authStore.ts`:
/// user, token, isAuthenticated, isLoading, profiles, activeProfile, betaCredits.
@Observable
public final class AuthManager {

    // MARK: - Published State

    public internal(set) var user: BayitUser?
    public internal(set) var token: String?
    public internal(set) var isLoading: Bool = false
    public internal(set) var profiles: [UserProfile] = []
    public internal(set) var activeProfile: UserProfile?
    public internal(set) var betaCredits: Int = 0
    public internal(set) var error: AuthError?

    /// Computed authentication status -- true when both user and token exist.
    public var isAuthenticated: Bool { user != nil && token != nil }

    // MARK: - Dependencies

    let configuration: AuthConfiguration
    let keychainService: KeychainService
    let logger: APILogger
    private let tokenProvider: AuthTokenProviderImpl

    /// Keychain keys
    let tokenKeychainKey = "bayit_firebase_id_token"
    let userKeychainKey = "bayit_cached_user"

    /// Firebase auth state listener handle
    var authStateHandle: AuthStateDidChangeListenerHandle?

    // MARK: - Initialization

    public init(
        configuration: AuthConfiguration,
        logger: APILogger
    ) {
        self.configuration = configuration
        self.keychainService = KeychainService(configuration: configuration)
        self.logger = logger
        self.tokenProvider = AuthTokenProviderImpl(
            keychainService: keychainService,
            logger: logger,
            tokenKeychainKey: tokenKeychainKey
        )

        restoreCachedSession()
        listenForAuthStateChanges()
    }

    deinit {
        if let handle = authStateHandle {
            Auth.auth().removeStateDidChangeListener(handle)
        }
    }

    // MARK: - Token Provider Access

    /// Provides the `AuthTokenProvider` for injection into BayitNetworking.
    public var authTokenProvider: AuthTokenProvider {
        tokenProvider
    }

    // MARK: - Sign Out

    public func signOut() async {
        do {
            try Auth.auth().signOut()
            GIDSignIn.sharedInstance.signOut()
        } catch {
            logger.error(
                "Sign-out encountered an error",
                metadata: ["error": error.localizedDescription]
            )
        }

        try? keychainService.delete(for: tokenKeychainKey)
        try? keychainService.delete(for: userKeychainKey)

        clearState()
        logger.info("User signed out", metadata: [:])
    }

    // MARK: - Token Refresh

    /// Forces a token refresh and returns the new token.
    @discardableResult
    public func refreshToken() async throws -> String {
        guard let firebaseUser = Auth.auth().currentUser else {
            throw AuthError.notAuthenticated
        }

        do {
            let result = try await firebaseUser.getIDTokenResult(forcingRefresh: true)
            let newToken = result.token

            try keychainService.save(token: newToken, for: tokenKeychainKey)
            token = newToken

            logger.debug(
                "Token refreshed successfully",
                metadata: ["user_id": firebaseUser.uid]
            )

            return newToken
        } catch {
            throw AuthError.tokenRefreshFailed(underlying: error.localizedDescription)
        }
    }

    // MARK: - Profile Management

    /// Selects a user profile, updating the active profile state.
    public func selectProfile(_ profile: UserProfile) async throws {
        activeProfile = profile

        logger.info(
            "Profile selected",
            metadata: [
                "profile_id": profile.id,
                "profile_name": profile.name,
                "is_child": String(profile.isChild),
            ]
        )
    }

    // MARK: - Beta Credits

    /// Fetches the current beta credit balance from the backend.
    ///
    /// Maps to `GET /api/v1/beta/credits/balance`.
    public func fetchBetaCredits() async throws {
        guard let currentToken = token, isAuthenticated else {
            throw AuthError.notAuthenticated
        }

        do {
            let balance = try await BetaCreditsClient.fetchBalance(
                token: currentToken,
                logger: logger
            )
            betaCredits = balance

            logger.debug("Beta credits fetched", metadata: ["balance": String(balance)])
        } catch {
            let wrapped = AuthError.betaCreditsFetchFailed(
                underlying: error.localizedDescription
            )
            self.error = wrapped
            throw wrapped
        }
    }

    // MARK: - Internal State Mutation

    /// Clears all local authentication state.
    func clearState() {
        user = nil
        token = nil
        profiles = []
        activeProfile = nil
        betaCredits = 0
        error = nil
    }
}
