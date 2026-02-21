import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Form Fields

extension RegisterView {
    var nameField: some View {
        labeledField(label: localization.t("register.name")) {
            AuthComponents.GlassTextField(
                placeholder: localization.t("register.namePlaceholder"),
                text: $name,
                contentType: .name,
                capitalization: .words
            )
        }
    }

    var emailField: some View {
        labeledField(label: localization.t("register.email")) {
            AuthComponents.GlassTextField(
                placeholder: localization.t("register.emailPlaceholder"),
                text: $email,
                contentType: .emailAddress,
                keyboardType: .emailAddress
            )
        }
    }

    var passwordField: some View {
        labeledField(label: localization.t("register.password")) {
            AuthComponents.GlassSecureField(
                placeholder: localization.t("register.passwordPlaceholder"),
                text: $password,
                showText: $showPassword,
                contentType: .newPassword
            )
        }
    }

    var confirmPasswordField: some View {
        labeledField(label: localization.t("register.confirmPassword")) {
            AuthComponents.GlassSecureField(
                placeholder: localization.t("register.confirmPasswordPlaceholder"),
                text: $confirmPassword,
                showText: $showConfirmPassword,
                contentType: .newPassword
            )
        }
    }

    func labeledField<Content: View>(
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

    var termsCheckbox: some View {
        Button { acceptTerms.toggle() } label: {
            HStack(alignment: .top, spacing: DesignTokens.Spacing.sm) {
                checkboxIcon
                termsLabel
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    var checkboxIcon: some View {
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

    var termsLabel: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(localization.t("register.acceptTerms") + " " + localization.t("register.termsOfService"))
                .font(.system(size: 13))
                .foregroundStyle(DesignTokens.Colors.Text.secondary)
            Text(localization.t("register.and") + " " + localization.t("register.privacyPolicy"))
                .font(.system(size: 13))
                .foregroundStyle(DesignTokens.Colors.Text.secondary)
        }
    }
}
