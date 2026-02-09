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

    /// Signs in with email and password via both the backend API and Firebase Auth.
    /// The backend login endpoint returns a JWT directly, so no token exchange is needed.
    public func signInWithEmail(email: String, password: String) async throws {
        isLoading = true
        error = nil

        do {
            try Task.checkCancellation()

            // First authenticate with Firebase (for Firebase state tracking)
            let authResult = try await Auth.auth().signIn(
                withEmail: email,
                password: password
            )

            // Then authenticate with the backend to get a backend JWT
            // The backend /auth/login endpoint returns JWT directly
            let backendResponse = try await BackendTokenExchangeClient.loginWithEmail(
                email: email,
                password: password,
                logger: logger
            )

            // Handle Firebase result with the backend tokens
            try await handleFirebaseAuthResult(
                authResult,
                providerToken: .emailPassword(
                    accessToken: backendResponse.accessToken,
                    refreshToken: backendResponse.refreshToken
                )
            )

            logger.info(
                "Email sign-in succeeded",
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
            let wrapped = AuthError.emailSignInFailed(
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
