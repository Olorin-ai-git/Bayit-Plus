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
    let backendTokenKeychainKey = "bayit_backend_jwt"
    let refreshTokenKeychainKey = "bayit_backend_refresh_token"
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
            tokenKeychainKey: backendTokenKeychainKey,
            refreshTokenKeychainKey: refreshTokenKeychainKey
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
        try? keychainService.delete(for: backendTokenKeychainKey)
        try? keychainService.delete(for: refreshTokenKeychainKey)
        try? keychainService.delete(for: userKeychainKey)

        clearState()
        logger.info("User signed out", metadata: [:])
    }

    // MARK: - Token Refresh

    /// Forces a backend token refresh using the stored refresh token.
    @discardableResult
    public func refreshToken() async throws -> String {
        guard let storedRefresh = try? keychainService.load(
            for: refreshTokenKeychainKey
        ) else {
            throw AuthError.notAuthenticated
        }

        do {
            let response = try await BackendTokenExchangeClient.refreshBackendToken(
                refreshToken: storedRefresh,
                logger: logger
            )

            try keychainService.save(
                token: response.accessToken, for: backendTokenKeychainKey
            )
            if let newRefresh = response.refreshToken {
                try keychainService.save(
                    token: newRefresh, for: refreshTokenKeychainKey
                )
            }
            token = response.accessToken

            logger.debug("Backend token refreshed successfully", metadata: [:])

            return response.accessToken
        } catch {
            throw AuthError.tokenRefreshFailed(underlying: error.localizedDescription)
        }
    }

    // MARK: - Profile Management

    /// Fetches all profiles for the current user from the backend.
    ///
    /// Maps to `GET /api/v1/profiles`. If no profiles exist, the backend
    /// auto-creates a default profile.
    public func loadProfiles() async throws {
        guard let currentToken = token, isAuthenticated else {
            throw AuthError.notAuthenticated
        }

        do {
            let fetchedProfiles = try await ProfilesClient.fetchProfiles(
                token: currentToken,
                logger: logger
            )
            profiles = fetchedProfiles

            // Auto-select first profile if none is active
            if activeProfile == nil, let first = fetchedProfiles.first {
                activeProfile = first
            }

            logger.debug(
                "Profiles loaded",
                metadata: ["count": String(fetchedProfiles.count)]
            )
        } catch {
            let wrapped = AuthError.profileLoadFailed(
                underlying: error.localizedDescription
            )
            self.error = wrapped
            throw wrapped
        }
    }

    /// Creates a new profile for the current user.
    ///
    /// Maps to `POST /api/v1/profiles`.
    /// - Parameters:
    ///   - name: Display name for the profile.
    ///   - avatarColor: Hex color string for the avatar background.
    ///   - isKidsProfile: Whether this is a kids profile with content restrictions.
    ///   - kidsAgeLimit: Maximum age rating for kids content (e.g., 3, 7, 12).
    ///   - pin: Optional PIN to lock this profile.
    /// - Returns: The newly created `UserProfile`.
    @discardableResult
    public func createProfile(
        name: String,
        avatarColor: String,
        isKidsProfile: Bool = false,
        kidsAgeLimit: Int? = nil,
        pin: String? = nil
    ) async throws -> UserProfile {
        guard let currentToken = token, isAuthenticated else {
            throw AuthError.notAuthenticated
        }

        let request = ProfilesClient.ProfileCreateRequest(
            name: name,
            avatarColor: avatarColor,
            isKidsProfile: isKidsProfile,
            kidsAgeLimit: kidsAgeLimit,
            pin: pin
        )

        let newProfile = try await ProfilesClient.createProfile(
            request: request,
            token: currentToken,
            logger: logger
        )

        // Append to local profiles list
        profiles.append(newProfile)

        logger.info(
            "Profile created",
            metadata: [
                "profile_id": newProfile.id,
                "name": newProfile.name,
            ]
        )

        return newProfile
    }

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
