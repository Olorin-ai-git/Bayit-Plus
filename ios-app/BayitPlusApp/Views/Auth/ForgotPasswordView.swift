import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Forgot Password screen - request password reset email
struct ForgotPasswordView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(LocalizationManager.self) private var localization

    @State private var email = ""
    @State private var isSubmitting = false
    @State private var isSubmitted = false
    @State private var errorMessage: String?

    let onBack: () -> Void

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.xl) {
                Spacer(minLength: DesignTokens.Spacing.xxxl)

                AuthComponents.LogoSection()

                if isSubmitted {
                    successCard
                } else {
                    requestCard
                }

                backToLoginButton

                Spacer(minLength: DesignTokens.Spacing.xl)
            }
            .padding(.horizontal, DesignTokens.Spacing.xl)
            .frame(maxWidth: 480)
            .frame(maxWidth: .infinity)
        }
    }

    // MARK: - Request Card

    private var requestCard: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            cardHeader

            if let error = errorMessage {
                AuthComponents.ErrorBanner(message: error)
            }

            emailField
            submitButton
        }
        .authGlassCard()
    }

    private var cardHeader: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("forgot_password.title"))
                .font(.system(size: DesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)

            Text(localization.t("forgot_password.subtitle"))
                .font(.system(size: 15))
                .foregroundStyle(DesignTokens.Colors.Text.secondary)
                .multilineTextAlignment(.center)
        }
    }

    private var emailField: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("common.email"))
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(DesignTokens.Colors.Text.secondary)

            AuthComponents.GlassTextField(
                placeholder: localization.t("common.email_placeholder"),
                text: $email,
                contentType: .emailAddress,
                keyboardType: .emailAddress
            )
        }
    }

    private var submitButton: some View {
        Button {
            Task { await handleSubmit() }
        } label: {
            if isSubmitting {
                ProgressView()
                    .progressViewStyle(.circular)
                    .tint(.white)
            } else {
                Text(localization.t("forgot_password.submit"))
                    .font(.system(size: 16, weight: .semibold))
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 52)
        .foregroundStyle(.white)
        .background(DesignTokens.Colors.Primary.base)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.default))
        .opacity(isSubmitting || email.isEmpty ? 0.5 : 1)
        .disabled(isSubmitting || email.isEmpty)
    }

    // MARK: - Success Card

    private var successCard: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "envelope.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(DesignTokens.Colors.Primary.base)

            VStack(spacing: DesignTokens.Spacing.sm) {
                Text(localization.t("forgot_password.success_title"))
                    .font(.system(size: DesignTokens.FontSize.xxxl, weight: .bold))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)

                Text(localization.t("forgot_password.success_message"))
                    .font(.system(size: 15))
                    .foregroundStyle(DesignTokens.Colors.Text.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .authGlassCard()
    }

    // MARK: - Back Button

    private var backToLoginButton: some View {
        Button {
            onBack()
        } label: {
            HStack(spacing: DesignTokens.Spacing.xs) {
                Image(systemName: "arrow.left")
                    .font(.system(size: 14))
                Text(localization.t("forgot_password.back_to_login"))
                    .font(.system(size: 15))
            }
            .foregroundStyle(DesignTokens.Colors.Text.secondary)
        }
    }

    // MARK: - Actions

    private func handleSubmit() async {
        errorMessage = nil
        isSubmitting = true

        do {
            try await authManager.requestPasswordReset(email: email)
            withAnimation {
                isSubmitted = true
            }
        } catch {
            errorMessage = error.localizedDescription
        }

        isSubmitting = false
    }
}
