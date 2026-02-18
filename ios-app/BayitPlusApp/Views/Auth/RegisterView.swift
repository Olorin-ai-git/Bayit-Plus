import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Registration screen matching web app design at /register
struct RegisterView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(LocalizationManager.self) private var localization

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
            .frame(maxWidth: 480)
            .frame(maxWidth: .infinity)
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
            Text(localization.t("register.title"))
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)

            Text(localization.t("register.subtitle"))
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
        labeledField(label: localization.t("register.name")) {
            AuthComponents.GlassTextField(
                placeholder: localization.t("register.namePlaceholder"),
                text: $name,
                contentType: .name,
                capitalization: .words
            )
        }
    }

    private var emailField: some View {
        labeledField(label: localization.t("register.email")) {
            AuthComponents.GlassTextField(
                placeholder: localization.t("register.emailPlaceholder"),
                text: $email,
                contentType: .emailAddress,
                keyboardType: .emailAddress
            )
        }
    }

    private var passwordField: some View {
        labeledField(label: localization.t("register.password")) {
            AuthComponents.GlassSecureField(
                placeholder: localization.t("register.passwordPlaceholder"),
                text: $password,
                showText: $showPassword,
                contentType: .newPassword
            )
        }
    }

    private var confirmPasswordField: some View {
        labeledField(label: localization.t("register.confirmPassword")) {
            AuthComponents.GlassSecureField(
                placeholder: localization.t("register.confirmPasswordPlaceholder"),
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
            Text(localization.t("register.acceptTerms") + " " + localization.t("register.termsOfService"))
                .font(.system(size: 13))
                .foregroundStyle(DesignTokens.Colors.Text.secondary)
            Text(localization.t("register.and") + " " + localization.t("register.privacyPolicy"))
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
                Text(localization.t("register.submit"))
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
                title: localization.t("register.continueWithGoogle"),
                iconName: "g.circle.fill",
                action: {
                    Task { try? await handleGoogleSignIn() }
                }
            )
            AuthComponents.SocialButton(
                title: localization.t("login.continueWithApple"),
                iconName: "apple.logo",
                action: {
                    Task { try? await handleAppleSignIn() }
                }
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
                Text(localization.t("register.haveAccount") + " ")
                    .foregroundStyle(DesignTokens.Colors.Text.secondary)
                + Text(localization.t("register.signIn"))
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
        guard !name.isEmpty else { validationError = localization.t("register.errors.nameRequired"); return }
        guard !email.isEmpty else { validationError = localization.t("register.errors.emailRequired"); return }
        guard !password.isEmpty else { validationError = localization.t("register.errors.passwordRequired"); return }
        guard password.count >= 8 else {
            validationError = localization.t("register.errors.passwordTooShort"); return
        }
        guard password == confirmPassword else {
            validationError = localization.t("register.errors.passwordMismatch"); return
        }
        guard acceptTerms else {
            validationError = localization.t("register.errors.acceptTerms"); return
        }

        do {
            try await authManager.signInWithEmail(email: email, password: password)
            onRegisterSuccess()
        } catch {
            // AuthManager sets its own error state
        }
    }
}
