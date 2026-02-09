import Foundation
import UIKit
import FirebaseAuth
#if canImport(GoogleSignIn)
import GoogleSignIn
#endif
import AuthenticationServices

// MARK: - Sign-In Methods

extension AuthManager {

    /// Initiates Google Sign-In via the Google SDK and Firebase Auth.
    /// After Firebase auth, exchanges the Google ID token with the backend
    /// for a backend-issued JWT.
    ///
    /// Available on iOS only. tvOS does not support the Google Sign-In
    /// presenting flow that requires a UIViewController.
    #if os(iOS)
    public func signInWithGoogle() async throws {
        isLoading = true
        error = nil

        do {
            try Task.checkCancellation()

            let rootVC = try await resolveRootViewController()

            let googleConfig = GIDConfiguration(
                clientID: configuration.googleClientID,
                serverClientID: configuration.googleServerClientID
            )
            GIDSignIn.sharedInstance.configuration = googleConfig

            try Task.checkCancellation()

            let result = try await GIDSignIn.sharedInstance.signIn(
                withPresenting: rootVC
            )

            guard let idToken = result.user.idToken?.tokenString else {
                throw AuthError.missingIDToken
            }

            try Task.checkCancellation()

            let credential = GoogleAuthProvider.credential(
                withIDToken: idToken,
                accessToken: result.user.accessToken.tokenString
            )

            let authResult = try await Auth.auth().signIn(with: credential)

            // Pass the Google ID token for backend JWT exchange
            try await handleFirebaseAuthResult(
                authResult,
                providerToken: .google(idToken: idToken)
            )

            logger.info(
                "Google sign-in succeeded",
                metadata: ["user_id": authResult.user.uid]
            )
        } catch is CancellationError {
            isLoading = false
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
            throw wrapped
        }
    }
    #endif

    /// Initiates Apple Sign-In via ASAuthorizationController and Firebase Auth.
    /// After Firebase auth, exchanges the Apple identity token with the backend
    /// for a backend-issued JWT.
    public func signInWithApple() async throws {
        isLoading = true
        error = nil

        do {
            try Task.checkCancellation()

            let appleResult = try await performAppleSignIn()

            guard let appleIDCredential = appleResult.credential
                    as? ASAuthorizationAppleIDCredential else {
                throw AuthError.appleSignInFailed(underlying: "Invalid credential type")
            }

            guard let identityTokenData = appleIDCredential.identityToken,
                  let identityToken = String(data: identityTokenData, encoding: .utf8)
            else {
                throw AuthError.missingIDToken
            }

            try Task.checkCancellation()

            let credential = OAuthProvider.appleCredential(
                withIDToken: identityToken,
                rawNonce: appleResult.nonce,
                fullName: appleIDCredential.fullName
            )

            let authResult = try await Auth.auth().signIn(with: credential)

            // Build full name from Apple's PersonNameComponents
            let fullName: String? = {
                guard let nameComponents = appleIDCredential.fullName else {
                    return nil
                }
                let formatter = PersonNameComponentsFormatter()
                let name = formatter.string(from: nameComponents)
                return name.isEmpty ? nil : name
            }()

            // Pass the Apple identity token for backend JWT exchange
            try await handleFirebaseAuthResult(
                authResult,
                providerToken: .apple(
                    identityToken: identityToken,
                    fullName: fullName,
                    email: appleIDCredential.email
                )
            )

            logger.info(
                "Apple sign-in succeeded",
                metadata: ["user_id": authResult.user.uid]
            )
        } catch is CancellationError {
            isLoading = false
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
            throw wrapped
        }
    }

    /// Signs in with email and password via the backend API only.
    /// The backend login endpoint returns a JWT directly, so no Firebase or token exchange is needed.
    /// Firebase Auth is skipped for email/password since the backend is the authoritative source.
    public func signInWithEmail(email: String, password: String) async throws {
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
                isBetaUser: loginResponse.user.isBetaUser ?? false,
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

    /// Signs in with a passkey using WebAuthn/FIDO2.
    ///
    /// Available on iOS 16+ and tvOS 16+. Uses platform authenticator (Face ID, Touch ID, or iCloud Keychain).
    /// On tvOS, the user can authenticate using a nearby iPhone/iPad via proximity auth.
    @available(iOS 16.0, tvOS 16.0, *)
    public func signInWithPasskey() async throws {
        isLoading = true
        error = nil

        do {
            try Task.checkCancellation()

            // Step 1: Get authentication options from backend
            let optionsResponse = try await BackendTokenExchangeClient.getPasskeyAuthOptions(
                logger: logger
            )

            guard let challengeData = Data(base64URLEncoded: optionsResponse.challenge) else {
                throw AuthError.passkeySignInFailed(underlying: "Invalid challenge format")
            }

            try Task.checkCancellation()

            // Step 2: Authenticate with platform passkey
            let passkeyHelper = PasskeyHelper()
            let assertion = try await passkeyHelper.authenticate(
                challenge: challengeData,
                relyingPartyIdentifier: optionsResponse.rpId
            )

            try Task.checkCancellation()

            // Step 3: Verify authentication with backend and get tokens
            let backendResponse = try await BackendTokenExchangeClient.verifyPasskeyAuth(
                credentialId: assertion.credentialID.base64URLEncodedString(),
                authenticatorData: assertion.rawAuthenticatorData.base64URLEncodedString(),
                signature: assertion.signature.base64URLEncodedString(),
                clientDataJSON: assertion.rawClientDataJSON.base64URLEncodedString(),
                challengeId: optionsResponse.challengeId,
                logger: logger
            )

            // Store backend tokens
            try keychainService.save(
                token: backendResponse.accessToken,
                for: backendTokenKeychainKey
            )
            if let refresh = backendResponse.refreshToken {
                try keychainService.save(
                    token: refresh,
                    for: refreshTokenKeychainKey
                )
            }

            // Fetch user profile from backend
            let userProfile = try await fetchUserProfile(token: backendResponse.accessToken)

            // Update state
            user = userProfile
            token = backendResponse.accessToken
            stampSessionTimestamp()
            isLoading = false

            logger.info(
                "Passkey sign-in succeeded",
                metadata: ["user_id": userProfile.id]
            )
        } catch is CancellationError {
            isLoading = false
            throw AuthError.cancelled
        } catch let authError as AuthError {
            isLoading = false
            error = authError
            throw authError
        } catch {
            let wrapped = AuthError.passkeySignInFailed(
                underlying: error.localizedDescription
            )
            isLoading = false
            self.error = wrapped
            throw wrapped
        }
    }

    // MARK: - Helpers

    #if os(iOS)
    /// Resolves the current key window's root view controller for presenting sign-in UI.
    /// Available on iOS only. tvOS uses a different presentation model.
    private func resolveRootViewController() async throws -> UIViewController {
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
