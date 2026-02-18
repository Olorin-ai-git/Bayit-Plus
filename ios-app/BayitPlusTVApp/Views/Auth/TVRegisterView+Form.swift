import BayitDesignSystem
import BayitLocalization
import SwiftUI

extension TVRegisterView {
    // MARK: - Form Fields

    var formFields: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            inputField(
                label: localization.t("register.fullName"),
                icon: "person.fill",
                text: $name,
                field: .name,
                isSecure: false
            )
            inputField(
                label: localization.t("register.email"),
                icon: "envelope.fill",
                text: $email,
                field: .email,
                isSecure: false
            )
            inputField(
                label: localization.t("register.password"),
                icon: "lock.fill",
                text: $password,
                field: .password,
                isSecure: true
            )
            inputField(
                label: localization.t("register.confirmPassword"),
                icon: "lock.fill",
                text: $confirmPassword,
                field: .confirmPassword,
                isSecure: true
            )
        }
    }

    func inputField(
        label: String,
        icon: String,
        text: Binding<String>,
        field: Field,
        isSecure: Bool
    ) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            Text(label)
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                .foregroundStyle(DesignTokens.Text.secondary)
                .kerning(2.0)
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.muted)
                Group {
                    if isSecure {
                        SecureField("", text: text)
                    } else {
                        TextField("", text: text)
                            .autocorrectionDisabled()
                    }
                }
                .textFieldStyle(.plain)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
                .tint(DesignTokens.Colors.Primary.light)
                .focused($focusedField, equals: field)
                .onChange(of: text.wrappedValue) { _, _ in errorMessage = nil }
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .fill(
                        focusedField == field
                            ? DesignTokens.Glass.bgMedium
                            : DesignTokens.Glass.bgLight
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .stroke(
                        focusedField == field
                            ? DesignTokens.Colors.Primary.base
                            : DesignTokens.Glass.border,
                        lineWidth: focusedField == field ? 2 : 1
                    )
            )
        }
    }
}
