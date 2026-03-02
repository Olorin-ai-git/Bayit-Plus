import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVCredentialPanel + Form Fields

extension TVCredentialPanel {
    var emailField: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            Text(localization.t("login.email"))
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                .foregroundStyle(DesignTokens.Text.secondary)
                .kerning(2.0)

            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "envelope.fill")
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.muted)

                ZStack(alignment: .leading) {
                    if email.isEmpty {
                        Text(localization.t("placeholder.email"))
                            .font(.system(size: TVDesignTokens.FontSize.base))
                            .foregroundStyle(DesignTokens.Colors.Primary.dark.opacity(0.7))
                    }
                    TextField("", text: $email)
                        .textFieldStyle(.plain)
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .tint(DesignTokens.Colors.Primary.light)
                        .autocorrectionDisabled()
                        .textContentType(.emailAddress)
                        .focused($focusedField, equals: .email)
                        .onChange(of: email) { _, _ in
                            errorMessage = nil
                        }
                }
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .fill(
                        focusedField == .email
                            ? DesignTokens.Glass.bgMedium
                            : DesignTokens.Glass.bgLight
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .stroke(
                        focusedField == .email
                            ? DesignTokens.Glass.borderFocus
                            : DesignTokens.Glass.border,
                        lineWidth: focusedField == .email
                            ? TVDesignTokens.Focus.ringWidth : 1
                    )
            )
            .shadow(
                color: focusedField == .email
                    ? DesignTokens.Glass.purpleGlow
                    : .clear,
                radius: TVDesignTokens.Focus.shadowRadius,
                x: 0,
                y: focusedField == .email ? 4 : 0
            )
        }
    }

    var passwordField: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            Text(localization.t("login.password"))
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                .foregroundStyle(DesignTokens.Text.secondary)
                .kerning(2.0)

            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "lock.fill")
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.muted)

                if isPasswordVisible {
                    TextField("Enter your password", text: $password)
                        .textFieldStyle(.plain)
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .textContentType(.password)
                        .focused($focusedField, equals: .password)
                        .onSubmit { signInWithEmail() }
                        .onChange(of: password) { _, _ in
                            errorMessage = nil
                        }
                } else {
                    SecureField("Enter your password", text: $password)
                        .textFieldStyle(.plain)
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .textContentType(.password)
                        .focused($focusedField, equals: .password)
                        .onSubmit { signInWithEmail() }
                        .onChange(of: password) { _, _ in
                            errorMessage = nil
                        }
                }

                Button(action: { isPasswordVisible.toggle() }) {
                    Image(systemName: isPasswordVisible ? "eye.slash.fill" : "eye.fill")
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Colors.Primary.light)
                }
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .fill(
                        focusedField == .password
                            ? DesignTokens.Glass.bgMedium
                            : DesignTokens.Glass.bgLight
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .stroke(
                        focusedField == .password
                            ? DesignTokens.Glass.borderFocus
                            : DesignTokens.Glass.border,
                        lineWidth: focusedField == .password
                            ? TVDesignTokens.Focus.ringWidth : 1
                    )
            )
            .shadow(
                color: focusedField == .password
                    ? DesignTokens.Glass.purpleGlow
                    : .clear,
                radius: TVDesignTokens.Focus.shadowRadius,
                x: 0,
                y: focusedField == .password ? 4 : 0
            )
        }
    }
}
