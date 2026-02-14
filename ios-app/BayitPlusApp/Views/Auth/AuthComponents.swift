import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Shared UI components for auth screens (login/register)
enum AuthComponents {

    // MARK: - Logo

    struct LogoSection: View {
        var body: some View {
            VStack(spacing: DesignTokens.Spacing.sm) {
                if let logoImage = UIImage(named: "logo") ?? Self.loadBundleLogo() {
                    Image(uiImage: logoImage)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 120, height: 60)
                }

                (Text("Bayit")
                    .foregroundColor(.white)
                + Text("+")
                    .foregroundColor(DesignTokens.Colors.Primary.base))
                    .font(.system(size: DesignTokens.FontSize.display, weight: .bold))
            }
        }

        private static func loadBundleLogo() -> UIImage? {
            guard let url = Bundle.main.url(forResource: "logo", withExtension: "png"),
                  let data = try? Data(contentsOf: url) else { return nil }
            return UIImage(data: data)
        }
    }

    // MARK: - Error Banner

    struct ErrorBanner: View {
        let message: String

        var body: some View {
            let errorColor = DesignTokens.ErrorColor.default
            Text(message)
                .font(.system(size: 14))
                .foregroundStyle(errorColor)
                .multilineTextAlignment(.center)
                .padding(DesignTokens.Spacing.md)
                .frame(maxWidth: .infinity)
                .background(errorColor.opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.default))
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.default)
                        .stroke(errorColor.opacity(0.3), lineWidth: 1)
                )
        }
    }

    // MARK: - Glass Text Field

    struct GlassTextField: View {
        let placeholder: String
        @Binding var text: String
        var contentType: UITextContentType?
        var keyboardType: UIKeyboardType = .default
        var capitalization: TextInputAutocapitalization = .never

        var body: some View {
            TextField(placeholder, text: $text)
                .textContentType(contentType)
                .keyboardType(keyboardType)
                .autocorrectionDisabled()
                .textInputAutocapitalization(capitalization)
                .font(.system(size: 14))
                .foregroundStyle(.white)
                .padding(.vertical, DesignTokens.Spacing.md)
                .padding(.horizontal, DesignTokens.Spacing.base)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.default))
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.default)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
        }
    }

    // MARK: - Glass Secure Field

    struct GlassSecureField: View {
        let placeholder: String
        @Binding var text: String
        @Binding var showText: Bool
        var contentType: UITextContentType?

        var body: some View {
            HStack {
                Group {
                    if showText {
                        TextField(placeholder, text: $text)
                            .textContentType(contentType)
                    } else {
                        SecureField(placeholder, text: $text)
                            .textContentType(contentType)
                    }
                }
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .font(.system(size: 14))
                .foregroundStyle(.white)

                Button { showText.toggle() } label: {
                    Image(systemName: showText ? "eye.slash" : "eye")
                        .font(.system(size: 16))
                        .foregroundStyle(DesignTokens.Colors.Text.muted)
                }
            }
            .padding(.vertical, DesignTokens.Spacing.md)
            .padding(.horizontal, DesignTokens.Spacing.base)
            .background(Color.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.default))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.default)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
        }
    }

    // MARK: - Social Button

    struct SocialButton: View {
        let title: String
        let iconName: String
        let action: () -> Void

        var body: some View {
            Button(action: action) {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    Image(systemName: iconName)
                        .font(.system(size: 20))
                    Text(title)
                        .font(.system(size: 16, weight: .medium))
                }
                .frame(maxWidth: .infinity)
                .frame(height: 52)
                .foregroundStyle(.white)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.default))
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.default)
                        .stroke(Color.white.opacity(0.15), lineWidth: 1)
                )
            }
        }
    }

    // MARK: - Or Divider

    struct OrDivider: View {
        @Environment(LocalizationManager.self) private var localization

        var body: some View {
            HStack {
                Rectangle()
                    .fill(Color.white.opacity(0.1))
                    .frame(height: 1)
                Text(localization.t("common.or"))
                    .font(.system(size: 14))
                    .foregroundStyle(DesignTokens.Colors.Text.secondary)
                    .padding(.horizontal, DesignTokens.Spacing.md)
                Rectangle()
                    .fill(Color.white.opacity(0.1))
                    .frame(height: 1)
            }
        }
    }

    // MARK: - Glass Card Modifier

    struct GlassCardModifier: ViewModifier {
        func body(content: Content) -> some View {
            content
                .padding(DesignTokens.Spacing.xl)
                .background(Color.white.opacity(0.03))
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
        }
    }
}

extension View {
    func authGlassCard() -> some View {
        modifier(AuthComponents.GlassCardModifier())
    }
}
