import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Reset Password screen - confirm password reset with token
struct ResetPasswordView: View {
    @Environment(AuthManager.self) var authManager
    @Environment(LocalizationManager.self) var localization

    let token: String
    let onSuccess: () -> Void

    @State var password = ""
    @State var confirmPassword = ""
    @State var showPassword = false
    @State var isSubmitting = false
    @State var isSuccess = false
    @State var errorMessage: String?

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.xl) {
                Spacer(minLength: DesignTokens.Spacing.xxxl)

                AuthComponents.LogoSection()

                if isSuccess {
                    successCard
                } else {
                    resetCard
                }

                Spacer(minLength: DesignTokens.Spacing.xl)
            }
            .padding(.horizontal, DesignTokens.Spacing.xl)
            .frame(maxWidth: 480)
            .frame(maxWidth: .infinity)
        }
    }

    // MARK: - Reset Card

    private var resetCard: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            cardHeader

            if let error = errorMessage {
                AuthComponents.ErrorBanner(message: error)
            }

            passwordFields
            passwordRequirements
            submitButton
        }
        .authGlassCard()
    }

    private var cardHeader: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("reset_password.title"))
                .font(.system(size: DesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)

            Text(localization.t("reset_password.subtitle"))
                .font(.system(size: 15))
                .foregroundStyle(DesignTokens.Colors.Text.secondary)
                .multilineTextAlignment(.center)
        }
    }

    private var passwordFields: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(localization.t("common.new_password"))
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(DesignTokens.Colors.Text.secondary)

                AuthComponents.GlassSecureField(
                    placeholder: localization.t("common.password_placeholder"),
                    text: $password,
                    showText: $showPassword,
                    contentType: .newPassword
                )
            }

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(localization.t("common.confirm_password"))
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(DesignTokens.Colors.Text.secondary)

                AuthComponents.GlassSecureField(
                    placeholder: localization.t("common.confirm_password_placeholder"),
                    text: $confirmPassword,
                    showText: $showPassword,
                    contentType: .newPassword
                )
            }
        }
    }

    private var passwordRequirements: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text(localization.t("reset_password.requirements"))
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(DesignTokens.Colors.Text.secondary)

            requirementRow(
                text: localization.t("reset_password.requirement_length"),
                met: password.count >= 8
            )
            requirementRow(
                text: localization.t("reset_password.requirement_uppercase"),
                met: password.range(of: "[A-Z]", options: .regularExpression) != nil
            )
            requirementRow(
                text: localization.t("reset_password.requirement_lowercase"),
                met: password.range(of: "[a-z]", options: .regularExpression) != nil
            )
            requirementRow(
                text: localization.t("reset_password.requirement_number"),
                met: password.range(of: "[0-9]", options: .regularExpression) != nil
            )
            requirementRow(
                text: localization.t("reset_password.requirement_match"),
                met: !confirmPassword.isEmpty && password == confirmPassword
            )
        }
    }

    private func requirementRow(text: String, met: Bool) -> some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            Image(systemName: met ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 14))
                .foregroundStyle(met ? DesignTokens.Colors.Primary.base : DesignTokens.Colors.Text.muted)

            Text(text)
                .font(.system(size: 13))
                .foregroundStyle(met ? DesignTokens.Colors.Text.primary : DesignTokens.Colors.Text.muted)
        }
    }

    private var submitButton: some View {
        Button {
            Task { await handleReset() }
        } label: {
            if isSubmitting {
                ProgressView()
                    .progressViewStyle(.circular)
                    .tint(.white)
            } else {
                Text(localization.t("reset_password.submit"))
                    .font(.system(size: 16, weight: .semibold))
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 52)
        .foregroundStyle(.white)
        .background(DesignTokens.Colors.Primary.base)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.default))
        .opacity(isSubmitting || !isPasswordValid ? 0.5 : 1)
        .disabled(isSubmitting || !isPasswordValid)
    }
}
