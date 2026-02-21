import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Extracted registration form fields: name, email, password,
/// confirm password, terms checkbox, and validation helpers.
struct RegisterFormFields: View {
    @Environment(LocalizationManager.self) private var localization

    @Binding var name: String
    @Binding var email: String
    @Binding var password: String
    @Binding var confirmPassword: String
    @Binding var showPassword: Bool
    @Binding var showConfirmPassword: Bool
    @Binding var acceptTerms: Bool

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            nameField
            emailField
            passwordField
            confirmPasswordField
            termsCheckbox
        }
    }

    // MARK: - Fields

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

    // MARK: - Helpers

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
}
