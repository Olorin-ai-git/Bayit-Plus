import BayitAuth
import BayitDesignSystem
import BayitLocalization
import LocalAuthentication
import SwiftUI

/// Login screen matching web app design at /login
struct LoginView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var biometricService = BiometricAuthService()

    let onRegister: () -> Void
    let onForgotPassword: () -> Void
    let onLoginSuccess: () -> Void

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.xl) {
                Spacer(minLength: DesignTokens.Spacing.xxxl)

                AuthComponents.LogoSection()

                glassCard

                termsFooter

                Spacer(minLength: DesignTokens.Spacing.xl)
            }
            .padding(.horizontal, DesignTokens.Spacing.xl)
            .frame(maxWidth: 480)
            .frame(maxWidth: .infinity)
        }
    }

    // MARK: - Glass Card

    private var glassCard: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            cardHeader
            errorMessage
            emailField
            passwordField
            signInButton
            AuthComponents.OrDivider()
            socialButtons
            signUpLink
        }
        .authGlassCard()
    }

    private var cardHeader: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("login.title"))
                .font(.system(size: DesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)

            Text(localization.t("login.subtitle"))
                .font(.system(size: 15))
                .foregroundStyle(DesignTokens.Colors.Text.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Error

    @ViewBuilder
    private var errorMessage: some View {
        if let error = authManager.error {
            AuthComponents.ErrorBanner(message: error.userFacingMessage)
        }
    }

    // MARK: - Fields

    private var emailField: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("login.email"))
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(Color.white.opacity(0.7))

            AuthComponents.GlassTextField(
                placeholder: localization.t("login.emailPlaceholder"),
                text: $email,
                contentType: .emailAddress,
                keyboardType: .emailAddress
            )
        }
    }

    private var passwordField: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack {
                Text(localization.t("login.password"))
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Color.white.opacity(0.7))
                Spacer()
                Button(localization.t("login.forgotPassword")) {
                    onForgotPassword()
                }
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(DesignTokens.Colors.Primary.base)
            }

            AuthComponents.GlassSecureField(
                placeholder: localization.t("login.passwordPlaceholder"),
                text: $password,
                showText: $showPassword,
                contentType: .password
            )
        }
    }

    // MARK: - Sign In Button

    private var signInButton: some View {
        Button(action: { Task { try await handleEmailLogin() } }) {
            HStack {
                if authManager.isLoading {
                    ProgressView()
                        .tint(.black)
                        .scaleEffect(0.8)
                }
                Text(localization.t("login.submit"))
                    .font(.system(size: 16, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .foregroundStyle(.black)
            .background(DesignTokens.Colors.Primary.base)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.default))
        }
        .disabled(authManager.isLoading)
        .opacity(authManager.isLoading ? 0.7 : 1.0)
    }

    // MARK: - Social Buttons

    private var socialButtons: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            // Face ID / Touch ID button (if available and credentials stored)
            if biometricService.isBiometricAvailable()
                && KeychainHelper.hasBiometricCredentials {
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

    private var biometricButtonTitle: String {
        switch biometricService.biometricType() {
        case .faceID: return localization.t("login.signInWithFaceId")
        case .touchID: return localization.t("login.signInWithTouchId")
        case .none: return localization.t("login.signInWithBiometric")
        }
    }

    private var biometricIconName: String {
        switch biometricService.biometricType() {
        case .faceID: return "faceid"
        case .touchID: return "touchid"
        case .none: return "lock.shield"
        }
    }

    // MARK: - Sign Up Link

    private var signUpLink: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: 1)
                .padding(.bottom, DesignTokens.Spacing.lg)

            Button(action: onRegister) {
                Text("\(localization.t("login.noAccount")) ")
                    .foregroundStyle(DesignTokens.Colors.Text.muted)
                + Text(localization.t("login.signUp"))
                    .foregroundStyle(DesignTokens.Colors.Primary.base)
                    .bold()
            }
            .font(.system(size: 14))
        }
    }

    // MARK: - Terms Footer

    private var termsFooter: some View {
        Text(localization.t("login.termsNotice"))
            .font(.system(size: 12))
            .foregroundStyle(DesignTokens.Colors.Text.secondary)
            .multilineTextAlignment(.center)
            .frame(maxWidth: 320)
    }

    // MARK: - Actions

    private func handleGoogleSignIn() async throws {
        try await authManager.signInWithGoogle()
        persistRefreshTokenForBiometric()
        onLoginSuccess()
    }

    private func handleAppleSignIn() async throws {
        try await authManager.signInWithApple()
        persistRefreshTokenForBiometric()
        onLoginSuccess()
    }

    private func handleEmailLogin() async throws {
        guard !email.isEmpty, !password.isEmpty else { return }
        try await authManager.signInWithEmail(email: email, password: password)

        if biometricService.isBiometricAvailable() {
            KeychainHelper.storeEmail(email)
            KeychainHelper.storePassword(password)
        }

        persistRefreshTokenForBiometric()
        onLoginSuccess()
    }

    private func handleBiometricSignIn() async {
        do {
            let authenticated = try await biometricService.authenticate(
                reason: "Sign in to Bayit+"
            )
            guard authenticated else { return }

            // Strategy 1: Stored email/password (from prior email sign-in)
            if let storedEmail = KeychainHelper.retrieveEmail(),
               let storedPassword = KeychainHelper.retrievePassword() {
                try await authManager.signInWithEmail(
                    email: storedEmail,
                    password: storedPassword
                )
                persistRefreshTokenForBiometric()
                onLoginSuccess()
                return
            }

            // Strategy 2: Stored refresh token (from prior Google/Apple sign-in)
            if let refreshToken = KeychainHelper.retrieveBiometricRefreshToken() {
                // Validate token before using it
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
                    // Token was rejected by the server. Clear it so subsequent
                    // Face ID attempts don't retry the same invalid token.
                    KeychainHelper.deleteBiometricRefreshToken()
                    // authManager.error is already set by restoreWithRefreshToken.
                }
                return
            }
        } catch {
            guard (error as NSError).code != LAError.userCancel.rawValue else {
                return
            }
            // authManager.error is set by the sign-in methods;
            // the error banner in the card header displays it automatically.
        }
    }

    /// Persists the current refresh token for future biometric sign-in.
    /// Stored separately so it survives AuthManager.signOut().
    private func persistRefreshTokenForBiometric() {
        guard biometricService.isBiometricAvailable(),
              let refreshToken = authManager.currentRefreshToken else { return }
        KeychainHelper.storeBiometricRefreshToken(refreshToken)
    }
}
