import BayitAuth
import BayitDesignSystem
import SwiftUI

/// Login screen matching web app design at /login
struct LoginView: View {
    @Environment(AuthManager.self) private var authManager

    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false

    let onRegister: () -> Void
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
            Text("Welcome Back")
                .font(.system(size: DesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)

            Text("Sign in to continue to Bayit+")
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
            Text("Email")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(Color.white.opacity(0.7))

            AuthComponents.GlassTextField(
                placeholder: "Enter your email",
                text: $email,
                contentType: .emailAddress,
                keyboardType: .emailAddress
            )
        }
    }

    private var passwordField: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack {
                Text("Password")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Color.white.opacity(0.7))
                Spacer()
                Button("Forgot password?") {}
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(DesignTokens.Colors.Primary.base)
            }

            AuthComponents.GlassSecureField(
                placeholder: "Enter your password",
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
                Text("Sign In")
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
            AuthComponents.SocialButton(
                title: "Continue with Google",
                iconName: "g.circle.fill",
                action: { Task { try await handleGoogleSignIn() } }
            )
            AuthComponents.SocialButton(
                title: "Continue with Apple",
                iconName: "apple.logo",
                action: { Task { try await handleAppleSignIn() } }
            )
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
                Text("Don't have an account? ")
                    .foregroundStyle(DesignTokens.Colors.Text.muted)
                + Text("Sign Up")
                    .foregroundStyle(DesignTokens.Colors.Primary.base)
                    .bold()
            }
            .font(.system(size: 14))
        }
    }

    // MARK: - Terms Footer

    private var termsFooter: some View {
        Text("By continuing, you agree to our Terms of Service and Privacy Policy")
            .font(.system(size: 12))
            .foregroundStyle(DesignTokens.Colors.Text.secondary)
            .multilineTextAlignment(.center)
            .frame(maxWidth: 320)
    }

    // MARK: - Actions

    private func handleGoogleSignIn() async throws {
        try await authManager.signInWithGoogle()
        onLoginSuccess()
    }

    private func handleAppleSignIn() async throws {
        try await authManager.signInWithApple()
        onLoginSuccess()
    }

    private func handleEmailLogin() async throws {
        guard !email.isEmpty, !password.isEmpty else { return }
        try await authManager.signInWithEmail(email: email, password: password)
        onLoginSuccess()
    }
}
