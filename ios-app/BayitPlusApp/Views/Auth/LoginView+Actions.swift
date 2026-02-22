import BayitAuth
import BayitDesignSystem
import BayitLocalization
import LocalAuthentication
import SwiftUI

// MARK: - Social Buttons, Biometric Helpers, and Sign-In Actions

extension LoginView {
    // MARK: - Social Buttons

    var socialButtons: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            // Face ID / Touch ID button (if available and credentials stored)
            if biometricService.isBiometricAvailable()
                && KeychainHelper.hasBiometricCredentials
            {
                AuthComponents.SocialButton(
                    title: biometricButtonTitle,
                    iconName: biometricIconName,
                    action: { Task { await handleBiometricSignIn() } }
                )
            }

            AuthComponents.SocialButton(
                title: localization.t("login.continueWithGoogle"),
                iconName: "g.circle.fill",
                action: {
                    Task {
                        try? await handleGoogleSignIn()
                    }
                }
            )
            AuthComponents.SocialButton(
                title: localization.t("login.continueWithApple"),
                iconName: "apple.logo",
                action: {
                    Task {
                        try? await handleAppleSignIn()
                    }
                }
            )
        }
    }

    var biometricButtonTitle: String {
        switch biometricService.biometricType() {
        case .faceID: return localization.t("login.signInWithFaceId")
        case .touchID: return localization.t("login.signInWithTouchId")
        case .none: return localization.t("login.signInWithBiometric")
        }
    }

    var biometricIconName: String {
        switch biometricService.biometricType() {
        case .faceID: return "faceid"
        case .touchID: return "touchid"
        case .none: return "lock.shield"
        }
    }

    // MARK: - Actions

    func handleGoogleSignIn() async throws {
        try await authManager.signInWithGoogle()
        persistRefreshTokenForBiometric()
        onLoginSuccess()
    }

    func handleAppleSignIn() async throws {
        try await authManager.signInWithApple()
        persistRefreshTokenForBiometric()
        onLoginSuccess()
    }

    func handleEmailLogin() async throws {
        guard !email.isEmpty, !password.isEmpty else { return }
        let normalizedEmail = email.lowercased()
        try await authManager.signInWithEmail(email: normalizedEmail, password: password)

        if biometricService.isBiometricAvailable() {
            KeychainHelper.storeEmail(normalizedEmail)
            KeychainHelper.storePassword(password)
        }

        persistRefreshTokenForBiometric()
        onLoginSuccess()
    }

    func handleBiometricSignIn() async {
        do {
            let authenticated = try await biometricService.authenticate(
                reason: "Sign in to Bayit+"
            )
            guard authenticated else { return }

            // Strategy 1: Stored email/password (from prior email sign-in)
            if let storedEmail = KeychainHelper.retrieveEmail(),
               let storedPassword = KeychainHelper.retrievePassword()
            {
                try await authManager.signInWithEmail(
                    email: storedEmail,
                    password: storedPassword
                )
                persistRefreshTokenForBiometric()
                onLoginSuccess()
                return
            }

            // Strategy 2: Refresh token restore (from prior Google/Apple/email sign-in)
            //
            // Prefer authManager.currentRefreshToken over the biometric-specific backup
            // because the canonical keychain entry tracks every token rotation, while
            // the biometric backup is only updated at sign-in time.
            let refreshToken = authManager.currentRefreshToken
                ?? KeychainHelper.retrieveBiometricRefreshToken()

            if let refreshToken {
                if KeychainHelper.isJWTExpired(refreshToken) {
                    KeychainHelper.deleteBiometricRefreshToken()
                    authManager.setError(.sessionExpired)
                    return
                }

                do {
                    try await authManager.restoreWithRefreshToken(refreshToken)
                    persistRefreshTokenForBiometric()
                    onLoginSuccess()
                } catch {
                    // Token was rejected by the server. Clear the biometric backup so
                    // subsequent Face ID attempts don't retry the same invalid token.
                    KeychainHelper.deleteBiometricRefreshToken()
                    // authManager.error is already set by restoreWithRefreshToken.
                }
                return
            }

            // No credentials found — biometric was enrolled but credentials are gone.
            authManager.setError(.sessionExpired)
        } catch {
            // Ignore deliberate user cancellation; surface all other LA failures.
            guard (error as NSError).code != LAError.userCancel.rawValue else {
                return
            }
            if authManager.error == nil {
                authManager.setError(.notAuthenticated)
            }
        }
    }

    /// Persists the current refresh token for future biometric sign-in.
    /// Stored separately so it survives AuthManager.signOut().
    func persistRefreshTokenForBiometric() {
        guard biometricService.isBiometricAvailable(),
              let refreshToken = authManager.currentRefreshToken else { return }
        KeychainHelper.storeBiometricRefreshToken(refreshToken)
    }
}
