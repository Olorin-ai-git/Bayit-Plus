import BayitAuth
import BayitDesignSystem
import SwiftUI

/// Registration screen matching web app design at /register
struct RegisterView: View {
    @Environment(AuthManager.self) private var authManager

    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var showPassword = false
    @State private var showConfirmPassword = false
    @State private var acceptTerms = false
    @State private var validationError: String?

    let onBack: () -> Void
    let onRegisterSuccess: () -> Void

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.xl) {
                Spacer(minLength: DesignTokens.Spacing.xxl)
                AuthComponents.LogoSection()
                glassCard
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
            nameField
            emailField
            passwordField
            confirmPasswordField
            termsCheckbox
            createAccountButton
            AuthComponents.OrDivider()
            socialButtons
            signInLink
        }
        .authGlassCard()
    }

    private var cardHeader: some View {
        VStack(spacing: DesignTokens.Spacing.xs) {
            Text("Create Account")
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)

            Text("Join Bayit+ streaming")
                .font(.system(size: 15))
                .foregroundStyle(DesignTokens.Colors.Text.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Error

    @ViewBuilder
    private var errorMessage: some View {
        if let errorText = validationError ?? authManager.error?.userFacingMessage {
            AuthComponents.ErrorBanner(message: errorText)
        }
    }

    // MARK: - Form Fields

    private var nameField: some View {
        labeledField(label: "Full Name") {
            AuthComponents.GlassTextField(
                placeholder: "Enter your name",
                text: $name,
                contentType: .name,
                capitalization: .words
            )
        }
    }

    private var emailField: some View {
        labeledField(label: "Email") {
            AuthComponents.GlassTextField(
                placeholder: "Enter your email",
                text: $email,
                contentType: .emailAddress,
                keyboardType: .emailAddress
            )
        }
    }

    private var passwordField: some View {
        labeledField(label: "Password") {
            AuthComponents.GlassSecureField(
                placeholder: "Create a password",
                text: $password,
                showText: $showPassword,
                contentType: .newPassword
            )
        }
    }

    private var confirmPasswordField: some View {
        labeledField(label: "Confirm Password") {
            AuthComponents.GlassSecureField(
                placeholder: "Confirm your password",
                text: $confirmPassword,
                showText: $showConfirmPassword,
                contentType: .newPassword
            )
        }
    }

    private func labeledField<Content: View>(
        label: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(label)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(Color.white.opacity(0.7))
            content()
        }
    }

    // MARK: - Terms Checkbox

    private var termsCheckbox: some View {
        Button { acceptTerms.toggle() } label: {
            HStack(alignment: .top, spacing: DesignTokens.Spacing.sm) {
                checkboxIcon
                termsLabel
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var checkboxIcon: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 4)
                .stroke(
                    acceptTerms ? DesignTokens.Colors.Primary.base : Color.white.opacity(0.3),
                    lineWidth: 2
                )
                .background(
                    RoundedRectangle(cornerRadius: 4)
                        .fill(acceptTerms ? DesignTokens.Primary.p600 : Color.white.opacity(0.05))
                )
                .frame(width: 22, height: 22)

            if acceptTerms {
                Image(systemName: "checkmark")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.black)
            }
        }
    }

    private var termsLabel: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("I agree to the Terms of Service")
                .font(.system(size: 13))
                .foregroundStyle(DesignTokens.Colors.Text.secondary)
            Text("and Privacy Policy")
                .font(.system(size: 13))
                .foregroundStyle(DesignTokens.Colors.Text.secondary)
        }
    }

    // MARK: - Buttons

    private var createAccountButton: some View {
        Button(action: { Task { await handleRegister() } }) {
            HStack {
                if authManager.isLoading {
                    ProgressView().tint(.black).scaleEffect(0.8)
                }
                Text("Create Account")
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

    private var signInLink: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: 1)
                .padding(.bottom, DesignTokens.Spacing.lg)

            Button(action: onBack) {
                Text("Already have an account? ")
                    .foregroundStyle(DesignTokens.Colors.Text.secondary)
                + Text("Sign In")
                    .foregroundStyle(DesignTokens.Colors.Primary.base)
                    .bold()
            }
            .font(.system(size: 14))
        }
    }

    // MARK: - Actions

    private func handleGoogleSignIn() async throws {
        try await authManager.signInWithGoogle()
        onRegisterSuccess()
    }

    private func handleAppleSignIn() async throws {
        try await authManager.signInWithApple()
        onRegisterSuccess()
    }

    private func handleRegister() async {
        validationError = nil
        guard !name.isEmpty else { validationError = "Please enter your name"; return }
        guard !email.isEmpty else { validationError = "Please enter your email"; return }
        guard !password.isEmpty else { validationError = "Please enter a password"; return }
        guard password.count >= 8 else {
            validationError = "Password must be at least 8 characters"; return
        }
        guard password == confirmPassword else {
            validationError = "Passwords do not match"; return
        }
        guard acceptTerms else {
            validationError = "Please accept the Terms of Service"; return
        }

        do {
            try await authManager.signInWithEmail(email: email, password: password)
            onRegisterSuccess()
        } catch {
            // AuthManager sets its own error state
        }
    }
}
