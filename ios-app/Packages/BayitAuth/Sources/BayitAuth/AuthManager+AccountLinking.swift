import BayitCore
import FirebaseAuth
import Foundation
#if os(iOS) && canImport(GoogleSignIn)
import GoogleSignIn
#endif
import AuthenticationServices

// MARK: - Account Linking

extension AuthManager {

    /// Fetches all linked authentication providers for the current user
    public func fetchLinkedProviders() async throws -> [LinkedProvider] {
        guard let currentToken = token, isAuthenticated else {
            throw AuthError.notAuthenticated
        }

        let config = AppConfiguration()
        let url = config.apiBaseURL.appendingPathComponent("auth/linked-providers")

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(currentToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = config.apiTimeout

        logger.debug("Fetching linked providers", metadata: [:])

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw AuthError.networkError(underlying: "Invalid response")
            }

            guard httpResponse.statusCode == 200 else {
                let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw AuthError.linkedProvidersFetchFailed(underlying: errorMessage)
            }

            let providers = try JSONDecoder().decode([LinkedProvider].self, from: data)

            logger.debug(
                "Linked providers fetched successfully",
                metadata: ["count": String(providers.count)]
            )

            return providers
        } catch let error as AuthError {
            throw error
        } catch {
            throw AuthError.linkedProvidersFetchFailed(underlying: error.localizedDescription)
        }
    }

    /// Links a Google account to the current user
    /// Available on iOS only
    #if os(iOS)
    @MainActor
    public func linkGoogleAccount() async throws {
        guard isAuthenticated else {
            throw AuthError.notAuthenticated
        }

        guard let firebaseUser = Auth.auth().currentUser else {
            throw AuthError.invalidFirebaseUser
        }

        logger.debug("Starting Google account linking", metadata: [:])

        do {
            let rootVC = try await resolveRootViewController()

            let googleConfig = GIDConfiguration(
                clientID: configuration.googleClientID,
                serverClientID: configuration.googleServerClientID
            )
            GIDSignIn.sharedInstance.configuration = googleConfig

            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootVC)

            guard let idToken = result.user.idToken?.tokenString else {
                throw AuthError.missingIDToken
            }

            let credential = GoogleAuthProvider.credential(
                withIDToken: idToken,
                accessToken: result.user.accessToken.tokenString
            )

            _ = try await firebaseUser.link(with: credential)

            logger.info("Google account linked successfully", metadata: [:])
        } catch let error as NSError {
            if error.code == AuthErrorCode.providerAlreadyLinked.rawValue {
                throw AuthError.providerAlreadyLinked(underlying: "Google account is already linked to another user")
            } else if error.code == AuthErrorCode.credentialAlreadyInUse.rawValue {
                throw AuthError.providerAlreadyLinked(underlying: "This Google account is already in use")
            }
            throw AuthError.linkProviderFailed(underlying: error.localizedDescription)
        }
    }
    #endif

    /// Links an Apple account to the current user
    @MainActor
    public func linkAppleAccount() async throws {
        guard isAuthenticated else {
            throw AuthError.notAuthenticated
        }

        guard let firebaseUser = Auth.auth().currentUser else {
            throw AuthError.invalidFirebaseUser
        }

        logger.debug("Starting Apple account linking", metadata: [:])

        do {
            let appleResult = try await performAppleSignIn()

            guard let appleIDCredential = appleResult.credential as? ASAuthorizationAppleIDCredential else {
                throw AuthError.appleSignInFailed(underlying: "Invalid credential type")
            }

            guard let identityTokenData = appleIDCredential.identityToken,
                  let identityToken = String(data: identityTokenData, encoding: .utf8) else {
                throw AuthError.missingIDToken
            }

            let credential = OAuthProvider.appleCredential(
                withIDToken: identityToken,
                rawNonce: appleResult.nonce,
                fullName: appleIDCredential.fullName
            )

            _ = try await firebaseUser.link(with: credential)

            logger.info("Apple account linked successfully", metadata: [:])
        } catch let error as NSError {
            if error.code == AuthErrorCode.providerAlreadyLinked.rawValue {
                throw AuthError.providerAlreadyLinked(underlying: "Apple account is already linked to another user")
            } else if error.code == AuthErrorCode.credentialAlreadyInUse.rawValue {
                throw AuthError.providerAlreadyLinked(underlying: "This Apple account is already in use")
            }
            throw AuthError.linkProviderFailed(underlying: error.localizedDescription)
        }
    }

    /// Unlinks a provider from the current user
    /// - Parameter providerType: The provider type to unlink
    @MainActor
    public func unlinkProvider(_ providerType: AuthProviderType) async throws {
        guard isAuthenticated else {
            throw AuthError.notAuthenticated
        }

        guard let firebaseUser = Auth.auth().currentUser else {
            throw AuthError.invalidFirebaseUser
        }

        logger.debug("Unlinking provider", metadata: ["provider_id": providerType.firebaseProviderID])

        do {
            _ = try await firebaseUser.unlink(fromProvider: providerType.firebaseProviderID)

            logger.info("Provider unlinked successfully", metadata: ["provider_id": providerType.firebaseProviderID])
        } catch {
            throw AuthError.unlinkProviderFailed(underlying: error.localizedDescription)
        }
    }
}
