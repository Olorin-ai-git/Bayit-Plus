import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Success Card, Validation & Actions

extension ResetPasswordView {
    // MARK: - Success Card

    var successCard: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(DesignTokens.Colors.Primary.base)

            VStack(spacing: DesignTokens.Spacing.sm) {
                Text(localization.t("reset_password.success_title"))
                    .font(.system(size: DesignTokens.FontSize.xxxl, weight: .bold))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)

                Text(localization.t("reset_password.success_message"))
                    .font(.system(size: 15))
                    .foregroundStyle(DesignTokens.Colors.Text.secondary)
                    .multilineTextAlignment(.center)
            }

            Button {
                onSuccess()
            } label: {
                Text(localization.t("reset_password.back_to_login"))
                    .font(.system(size: 16, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .foregroundStyle(.white)
                    .background(DesignTokens.Colors.Primary.base)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.default))
            }
        }
        .authGlassCard()
    }

    // MARK: - Validation

    var isPasswordValid: Bool {
        password.count >= 8 &&
            password.range(of: "[A-Z]", options: .regularExpression) != nil &&
            password.range(of: "[a-z]", options: .regularExpression) != nil &&
            password.range(of: "[0-9]", options: .regularExpression) != nil &&
            !confirmPassword.isEmpty &&
            password == confirmPassword
    }

    // MARK: - Actions

    func handleReset() async {
        errorMessage = nil
        isSubmitting = true

        do {
            try await authManager.confirmPasswordReset(token: token, newPassword: password)
            withAnimation {
                isSuccess = true
            }
        } catch {
            errorMessage = error.localizedDescription
        }

        isSubmitting = false
    }
}
