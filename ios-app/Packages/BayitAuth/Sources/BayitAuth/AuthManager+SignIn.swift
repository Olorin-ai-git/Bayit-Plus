import Foundation
import UIKit
import FirebaseAuth
import GoogleSignIn
import AuthenticationServices

// MARK: - Sign-In Methods

extension AuthManager {

    /// Initiates Google Sign-In via the Google SDK and Firebase Auth.
    public func signInWithGoogle() async throws {
        isLoading = true
        error = nil

        do {
            try Task.checkCancellation()

            let rootVC = try await resolveRootViewController()

            let googleConfig = GIDConfiguration(clientID: configuration.googleClientID)
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
            try await handleFirebaseAuthResult(authResult)

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

    /// Initiates Apple Sign-In via ASAuthorizationController and Firebase Auth.
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
            try await handleFirebaseAuthResult(authResult)

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

    /// Signs in with email and password via Firebase Auth.
    public func signInWithEmail(email: String, password: String) async throws {
        isLoading = true
        error = nil

        do {
            try Task.checkCancellation()

            let authResult = try await Auth.auth().signIn(
                withEmail: email,
                password: password
            )
            try await handleFirebaseAuthResult(authResult)

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

    /// Resolves the current key window's root view controller for presenting sign-in UI.
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
}
