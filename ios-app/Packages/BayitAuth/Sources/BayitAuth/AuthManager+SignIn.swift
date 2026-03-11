import Foundation
#if os(iOS) || os(tvOS)
    import UIKit
#endif
import FirebaseAuth
#if canImport(GoogleSignIn)
    import GoogleSignIn
#endif
import AuthenticationServices

// MARK: - Sign-In Methods

public extension AuthManager {
    // Initiates Google Sign-In via the Google SDK and Firebase Auth.
    // After Firebase auth, exchanges the Google ID token with the backend
    // for a backend-issued JWT.
    //
    // Available on iOS only. tvOS does not support the Google Sign-In
    // presenting flow that requires a UIViewController.
    #if os(iOS)
        func signInWithGoogle() async throws {
            isLoading = true
            error = nil

            do {
                try Task.checkCancellation()

                let rootVC: UIViewController
                do {
                    rootVC = try await resolveRootViewController()
                } catch {
                    isLoading = false
                    let err = AuthError.googleSignInFailed(
                        underlying: "Could not find root view controller"
                    )
                    self.error = err
                    logger.error("Google Sign In: No root view controller", metadata: [:])
                    throw err
                }

                let googleConfig = GIDConfiguration(
                    clientID: configuration.googleClientID,
                    serverClientID: configuration.googleServerClientID
                )
                GIDSignIn.sharedInstance.configuration = googleConfig

                try Task.checkCancellation()

                let result: GIDSignInResult
                do {
                    result = try await GIDSignIn.sharedInstance.signIn(
                        withPresenting: rootVC
                    )
                } catch let gidError {
                    isLoading = false
                    let err = AuthError.googleSignInFailed(
                        underlying: "Google SDK error: \(gidError.localizedDescription)"
                    )
                    error = err
                    logger.error(
                        "Google Sign In: SDK error",
                        metadata: ["error": gidError.localizedDescription]
                    )
                    throw err
                }

                guard let idToken = result.user.idToken?.tokenString else {
                    isLoading = false
                    let err = AuthError.missingIDToken
                    error = err
                    logger.error("Google Sign In: Missing ID token", metadata: [:])
                    throw err
                }

                try Task.checkCancellation()

                let credential = GoogleAuthProvider.credential(
                    withIDToken: idToken,
                    accessToken: result.user.accessToken.tokenString
                )

                let authResult: AuthDataResult
                do {
                    authResult = try await Auth.auth().signIn(with: credential)
                } catch let firebaseError {
                    isLoading = false
                    let err = AuthError.googleSignInFailed(
                        underlying: "Firebase auth failed: \(firebaseError.localizedDescription)"
                    )
                    error = err
                    logger.error(
                        "Google Sign In: Firebase authentication failed",
                        metadata: ["error": firebaseError.localizedDescription]
                    )
                    throw err
                }

                try Task.checkCancellation()

                do {
                    try await handleFirebaseAuthResult(
                        authResult,
                        providerToken: .google(idToken: idToken)
                    )
                } catch let backendError {
                    isLoading = false
                    let err = AuthError.googleSignInFailed(
                        underlying: "Backend exchange failed: \(backendError.localizedDescription)"
                    )
                    error = err
                    logger.error(
                        "Google Sign In: Backend token exchange failed",
                        metadata: ["error": backendError.localizedDescription]
                    )
                    throw err
                }

                logger.info(
                    "Google sign-in succeeded",
                    metadata: ["user_id": authResult.user.uid]
                )
            } catch is CancellationError {
                isLoading = false
                error = AuthError.cancelled
                throw AuthError.cancelled
            } catch let authError as AuthError {
                isLoading = false
                error = authError
                throw authError
            } catch {
                let wrapped = AuthError.googleSignInFailed(
                    underlying: error.localizedDescription
                )
                isLoading = false
                self.error = wrapped
                logger.error(
                    "Google Sign In: Unexpected error",
                    metadata: ["error": error.localizedDescription]
                )
                throw wrapped
            }
        }
    #endif

    /// Initiates Apple Sign-In via ASAuthorizationController and Firebase Auth.
    /// After Firebase auth, exchanges the Apple identity token with the backend
    /// for a backend-issued JWT.
    func signInWithApple() async throws {
        isLoading = true
        error = nil

        do {
            try Task.checkCancellation()

            let appleResult = try await performAppleSignIn()

            guard let appleIDCredential = appleResult.credential
                as? ASAuthorizationAppleIDCredential
            else {
                isLoading = false
                let err = AuthError.appleSignInFailed(underlying: "Invalid credential type")
                error = err
                logger.error("Apple Sign In: Invalid credential type", metadata: [:])
                throw err
            }

            guard let identityTokenData = appleIDCredential.identityToken,
                  let identityToken = String(data: identityTokenData, encoding: .utf8)
            else {
                isLoading = false
                let err = AuthError.missingIDToken
                error = err
                logger.error("Apple Sign In: Missing identity token", metadata: [:])
                throw err
            }

            try Task.checkCancellation()

            let credential = OAuthProvider.appleCredential(
                withIDToken: identityToken,
                rawNonce: appleResult.nonce,
                fullName: appleIDCredential.fullName
            )

            let authResult: AuthDataResult
            do {
                authResult = try await Auth.auth().signIn(with: credential)
            } catch let firebaseError {
                isLoading = false
                let err = AuthError.appleSignInFailed(
                    underlying: "Firebase auth failed: \(firebaseError.localizedDescription)"
                )
                error = err
                logger.error(
                    "Apple Sign In: Firebase authentication failed",
                    metadata: ["error": firebaseError.localizedDescription]
                )
                throw err
            }

            try Task.checkCancellation()

            let fullName: String? = {
                guard let nameComponents = appleIDCredential.fullName else {
                    return nil
                }
                let formatter = PersonNameComponentsFormatter()
                let name = formatter.string(from: nameComponents)
                return name.isEmpty ? nil : name
            }()

            do {
                try await handleFirebaseAuthResult(
                    authResult,
                    providerToken: .apple(
                        identityToken: identityToken,
                        fullName: fullName,
                        email: appleIDCredential.email
                    )
                )
            } catch let backendError {
                isLoading = false
                let err = AuthError.appleSignInFailed(
                    underlying: "Backend exchange failed: \(backendError.localizedDescription)"
                )
                error = err
                logger.error(
                    "Apple Sign In: Backend token exchange failed",
                    metadata: ["error": backendError.localizedDescription]
                )
                throw err
            }

            logger.info(
                "Apple sign-in succeeded",
                metadata: ["user_id": authResult.user.uid]
            )
        } catch is CancellationError {
            isLoading = false
            error = AuthError.cancelled
            throw AuthError.cancelled
        } catch let authError as AuthError {
            isLoading = false
            error = authError
            throw authError
        } catch {
            let wrapped = AuthError.appleSignInFailed(
                underlying: error.localizedDescription
            )
            isLoading = false
            self.error = wrapped
            logger.error(
                "Apple Sign In: Unexpected error",
                metadata: ["error": error.localizedDescription]
            )
            throw wrapped
        }
    }

    /// Registers a new user with email and password via Olorin Auth.
    ///
    /// Calls the backend `/auth/v2/register` endpoint which delegates to auth.olorin.ai
    /// while maintaining Bayit+ specific features (payment flow, beta users, etc).
    func signUpWithEmail(email: String, password: String, name: String) async throws {
        isLoading = true
        error = nil

        do {
            try Task.checkCancellation()

            // Register via Olorin Auth proxy
            let registrationResponse = try await BackendTokenExchangeClient.registerWithEmail(
                email: email,
                password: password,
                name: name,
                logger: logger
            )

            // Store backend tokens in keychain
            try keychainService.save(
                token: registrationResponse.accessToken,
                for: backendTokenKeychainKey
            )
            if let refresh = registrationResponse.refreshToken {
                try keychainService.save(
                    token: refresh,
                    for: refreshTokenKeychainKey
                )
            }

            // Build BayitUser from registration response
            let bayitUser = BayitUser(
                id: registrationResponse.user.id,
                email: registrationResponse.user.email,
                displayName: registrationResponse.user.name,
                photoURL: registrationResponse.user.profileImageUrl != nil ? URL(string: registrationResponse.user.profileImageUrl!) : nil,
                role: UserRole(rawValue: registrationResponse.user.role) ?? .user,
                isActive: registrationResponse.user.isActive,
                subscription: nil,
                isVerified: registrationResponse.user.isVerified ?? false,
                createdAt: nil,
                lastLogin: nil
            )

            // Cache user data in Keychain
            if let userData = try? JSONEncoder().encode(bayitUser) {
                try? keychainService.save(
                    token: String(data: userData, encoding: .utf8) ?? "",
                    for: userKeychainKey
                )
            }

            // Update state
            user = bayitUser
            token = registrationResponse.accessToken
            stampSessionTimestamp()
            isLoading = false

            logger.info(
                "Email registration succeeded",
                metadata: ["user_id": bayitUser.id]
            )
        } catch is CancellationError {
            isLoading = false
            throw AuthError.cancelled
        } catch let authError as AuthError {
            isLoading = false
            error = authError
            throw authError
        } catch {
            let wrapped = AuthError.registrationFailed(
                underlying: error.localizedDescription
            )
            isLoading = false
            self.error = wrapped
            throw wrapped
        }
    }

    /// Signs in with email and password via Olorin Auth.
    ///
    /// Calls the backend `/auth/v2/login` endpoint which delegates to auth.olorin.ai
    /// while syncing with Bayit+ database for app-specific features.
    func signInWithEmail(email: String, password: String) async throws {
        isLoading = true
        error = nil

        do {
            try Task.checkCancellation()

            // Authenticate with the backend to get JWT and user data
            // The backend /auth/login endpoint returns JWT and user data directly
            let loginResponse = try await BackendTokenExchangeClient.loginWithEmail(
                email: email,
                password: password,
                logger: logger
            )

            // Store backend tokens in keychain
            try keychainService.save(
                token: loginResponse.accessToken,
                for: backendTokenKeychainKey
            )
            if let refresh = loginResponse.refreshToken {
                try keychainService.save(
                    token: refresh,
                    for: refreshTokenKeychainKey
                )
            }

            // Build BayitUser from login response
            let bayitUser = BayitUser(
                id: loginResponse.user.id,
                email: loginResponse.user.email,
                displayName: loginResponse.user.name,
                photoURL: loginResponse.user.profileImageUrl != nil ? URL(string: loginResponse.user.profileImageUrl!) : nil,
                role: UserRole(rawValue: loginResponse.user.role) ?? .user,
                isActive: loginResponse.user.isActive,
                subscription: nil,
                isVerified: loginResponse.user.isVerified ?? false,
                createdAt: nil,
                lastLogin: nil
            )

            // Cache user data in Keychain
            if let userData = try? JSONEncoder().encode(bayitUser) {
                try? keychainService.save(
                    token: String(data: userData, encoding: .utf8) ?? "",
                    for: userKeychainKey
                )
            }

            // Update state
            user = bayitUser
            token = loginResponse.accessToken
            stampSessionTimestamp()
            isLoading = false

            logger.info(
                "Email sign-in succeeded",
                metadata: ["user_id": bayitUser.id]
            )
        } catch is CancellationError {
            isLoading = false
            throw AuthError.cancelled
        } catch let authError as AuthError {
            isLoading = false
            error = authError
            throw authError
        } catch {
            let wrapped = AuthError.emailSignInFailed(
                underlying: error.localizedDescription
            )
            isLoading = false
            self.error = wrapped
            throw wrapped
        }
    }

    /// Restores a session using a refresh token via the Olorin Auth Service.
    ///
    /// Called during biometric (Face ID / Touch ID) login to exchange a stored
    /// refresh token for a fresh access token without requiring the user to
    /// re-authenticate with Google, Apple, or email/password.
    func restoreWithRefreshToken(_ refreshToken: String) async throws {
        isLoading = true
        error = nil

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
            isLoading = false

            logger.info(
                "Session restored via refresh token",
                metadata: ["user_id": bayitUser.id]
            )
        } catch let authError as AuthError {
            isLoading = false
            error = authError
            throw authError
        } catch {
            let wrapped = AuthError.tokenRefreshFailed(
                underlying: error.localizedDescription
            )
            isLoading = false
            self.error = wrapped
            throw wrapped
        }
    }

    // MARK: - Biometric Login

    // Restores a session after biometric authentication succeeds.
    // Tries the stored refresh token first. If unavailable, silently
    // restores the previous Google Sign-In session to get a fresh
    // ID token and exchanges it with the backend for a new JWT.
    #if os(iOS)
        func loginWithBiometric() async throws {
            isLoading = true
            error = nil

            do {
                if let rt = try? keychainService.load(for: refreshTokenKeychainKey) {
                    try await restoreWithRefreshToken(rt)
                    return
                }

                let googleUser = try await GIDSignIn.sharedInstance
                    .restorePreviousSignIn()
                guard let googleIDToken = googleUser.idToken?.tokenString else {
                    throw AuthError.biometricAuthFailed(
                        underlying: "No stored session for biometric sign-in"
                    )
                }

                let credential = GoogleAuthProvider.credential(
                    withIDToken: googleIDToken,
                    accessToken: googleUser.accessToken.tokenString
                )
                let authResult = try await Auth.auth().signIn(with: credential)
                let firebaseToken = try await authResult.user.getIDToken()
                try keychainService.save(
                    token: firebaseToken, for: tokenKeychainKey
                )

                let backendToken = try await BackendTokenExchangeClient
                    .loginWithGoogle(
                        idToken: googleIDToken,
                        logger: logger
                    )

                try keychainService.save(
                    token: backendToken.accessToken,
                    for: backendTokenKeychainKey
                )
                if let rt = backendToken.refreshToken {
                    try keychainService.save(
                        token: rt, for: refreshTokenKeychainKey
                    )
                }

                let bayitUser = try await fetchUserProfile(
                    token: backendToken.accessToken
                )
                if let userData = try? JSONEncoder().encode(bayitUser) {
                    try? keychainService.save(
                        token: String(data: userData, encoding: .utf8) ?? "",
                        for: userKeychainKey
                    )
                }

                user = bayitUser
                token = backendToken.accessToken
                stampSessionTimestamp()
                isLoading = false

                logger.info(
                    "Biometric sign-in successful via Google restore",
                    metadata: ["user_id": bayitUser.id]
                )
            } catch let authError as AuthError {
                isLoading = false
                error = authError
                throw authError
            } catch {
                let wrapped = AuthError.biometricAuthFailed(
                    underlying: error.localizedDescription
                )
                isLoading = false
                self.error = wrapped
                throw wrapped
            }
        }
    #endif

    // MARK: - Helpers

    #if os(iOS)
        /// Resolves the current key window's root view controller for presenting sign-in UI.
        /// Available on iOS only. tvOS uses a different presentation model.
        func resolveRootViewController() async throws -> UIViewController {
            guard let windowScene = await MainActor.run(body: {
                UIApplication.shared.connectedScenes
                    .compactMap { $0 as? UIWindowScene }
                    .first
            }) else {
                throw AuthError.googleSignInFailed(underlying: "No active window scene")
            }

            guard let rootVC = await MainActor.run(body: {
                windowScene.windows.first(where: { $0.isKeyWindow })?.rootViewController
            }) else {
                throw AuthError.googleSignInFailed(underlying: "No root view controller")
            }

            return rootVC
        }
    #endif
}
