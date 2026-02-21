import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Form fields, buttons, and auth actions extracted from LoginView.
extension LoginView {
    // MARK: - Card Header

    var cardHeader: some View {
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
    var errorMessage: some View {
        if let error = authManager.error {
            AuthComponents.ErrorBanner(message: error.userFacingMessage)
        }
    }

    // MARK: - Fields

    var emailField: some View {
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

    var passwordField: some View {
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

    var signInButton: some View {
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

    // MARK: - Sign Up Link

    var signUpLink: some View {
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

    var termsFooter: some View {
        Text(localization.t("login.termsNotice"))
            .font(.system(size: 12))
            .foregroundStyle(DesignTokens.Colors.Text.secondary)
            .multilineTextAlignment(.center)
            .frame(maxWidth: 320)
    }
}
