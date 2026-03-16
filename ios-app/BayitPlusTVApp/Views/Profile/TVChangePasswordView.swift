import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Password change/set screen for tvOS.
struct TVChangePasswordView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos

    let hasPassword: Bool
    let onDismiss: () -> Void

    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var isSaving = false
    @State private var error: String?
    @State private var success = false
    @FocusState private var focusedField: Field?

    private enum Field { case current, newPass, confirm }

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xxxl) {
            Image(systemName: "key.fill")
                .font(.system(size: 60))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(hasPassword
                ? localization.t("profile.changePassword")
                : localization.t("settings.setPassword"))
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            if success {
                successView
            } else {
                formView
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .task { focusedField = hasPassword ? .current : .newPass }
    }

    private var formView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            if hasPassword {
                SecureField(localization.t("common.password_placeholder"), text: $currentPassword)
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .padding(TVDesignTokens.Spacing.lg)
                    .background(DesignTokens.Glass.bgMedium)
                    .cornerRadius(TVDesignTokens.Radius.md)
                    .focused($focusedField, equals: .current)
                    .frame(maxWidth: 600)
            }

            SecureField(localization.t("common.new_password"), text: $newPassword)
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .padding(TVDesignTokens.Spacing.lg)
                .background(DesignTokens.Glass.bgMedium)
                .cornerRadius(TVDesignTokens.Radius.md)
                .focused($focusedField, equals: .newPass)
                .frame(maxWidth: 600)

            SecureField(localization.t("common.confirm_password"), text: $confirmPassword)
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .padding(TVDesignTokens.Spacing.lg)
                .background(DesignTokens.Glass.bgMedium)
                .cornerRadius(TVDesignTokens.Radius.md)
                .focused($focusedField, equals: .confirm)
                .frame(maxWidth: 600)

            passwordRequirements

            if let error {
                Text(error)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Colors.Semantic.error)
            }

            HStack(spacing: TVDesignTokens.Spacing.xl) {
                Button {
                    onDismiss()
                } label: {
                    Text(localization.t("common.cancel"))
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .frame(width: 220, height: 70)
                }
                .buttonStyle(.plain)
                .background(DesignTokens.Glass.bgLight)
                .cornerRadius(TVDesignTokens.Radius.md)

                Button {
                    Task { await changePassword() }
                } label: {
                    Group {
                        if isSaving {
                            ProgressView().tint(.white)
                        } else {
                            Text(localization.t("common.save"))
                                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                                .foregroundStyle(.white)
                        }
                    }
                    .frame(width: 220, height: 70)
                }
                .buttonStyle(.plain)
                .background(isFormValid
                    ? LinearGradient(
                        colors: [DesignTokens.Primary.p400, DesignTokens.Secondary.s400],
                        startPoint: .leading, endPoint: .trailing
                    )
                    : LinearGradient(
                        colors: [DesignTokens.Glass.bgMedium, DesignTokens.Glass.bgMedium],
                        startPoint: .leading, endPoint: .trailing
                    ))
                .cornerRadius(TVDesignTokens.Radius.md)
                .disabled(!isFormValid || isSaving)
            }
        }
    }

    private var passwordRequirements: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
            requirementRow(localization.t("reset_password.requirement_length"),
                           met: newPassword.count >= 8)
            requirementRow(localization.t("reset_password.requirement_uppercase"),
                           met: newPassword.range(of: "[A-Z]", options: .regularExpression) != nil)
            requirementRow(localization.t("reset_password.requirement_lowercase"),
                           met: newPassword.range(of: "[a-z]", options: .regularExpression) != nil)
            requirementRow(localization.t("reset_password.requirement_number"),
                           met: newPassword.range(of: "[0-9]", options: .regularExpression) != nil)
            requirementRow(localization.t("reset_password.requirement_match"),
                           met: !newPassword.isEmpty && newPassword == confirmPassword)
        }
        .frame(maxWidth: 600, alignment: .leading)
    }

    private func requirementRow(_ text: String, met: Bool) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            Image(systemName: met ? "checkmark.circle.fill" : "circle")
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(met ? DesignTokens.Success.default : DesignTokens.Text.muted)
            Text(text)
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(met ? DesignTokens.Text.primary : DesignTokens.Text.muted)
        }
    }

    private var successView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 72))
                .foregroundStyle(DesignTokens.Success.default)

            Text(localization.t("common.success"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Button {
                onDismiss()
            } label: {
                Text(localization.t("common.done"))
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 220, height: 70)
            }
            .buttonStyle(.plain)
            .background(DesignTokens.Primary.p400)
            .cornerRadius(TVDesignTokens.Radius.md)
        }
    }

    private var isFormValid: Bool {
        let passValid = newPassword.count >= 8
            && newPassword.range(of: "[A-Z]", options: .regularExpression) != nil
            && newPassword.range(of: "[a-z]", options: .regularExpression) != nil
            && newPassword.range(of: "[0-9]", options: .regularExpression) != nil
            && newPassword == confirmPassword
        return hasPassword ? (!currentPassword.isEmpty && passValid) : passValid
    }

    private func changePassword() async {
        error = nil
        isSaving = true
        do {
            let request = ChangePasswordRequest(
                currentPassword: currentPassword,
                newPassword: newPassword
            )
            _ = try await repos.settings.changePassword(request: request)
            success = true
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }
        isSaving = false
    }
}
