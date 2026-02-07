import SwiftUI

/// Glass-styled text field matching the @bayit/glass GlassInput component
public struct GlassTextField: View {
    let placeholder: String
    @Binding var text: String
    let isSecure: Bool
    let icon: Image?
    @FocusState private var isFocused: Bool

    public init(
        _ placeholder: String,
        text: Binding<String>,
        isSecure: Bool = false,
        icon: Image? = nil
    ) {
        self.placeholder = placeholder
        self._text = text
        self.isSecure = isSecure
        self.icon = icon
    }

    public var body: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            if let icon {
                icon
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            if isSecure {
                SecureField(placeholder, text: $text)
                    .focused($isFocused)
            } else {
                TextField(placeholder, text: $text)
                    .focused($isFocused)
            }
        }
        .font(.system(size: DesignTokens.FontSize.base))
        .foregroundStyle(DesignTokens.Text.primary)
        .padding(.vertical, DesignTokens.Spacing.md)
        .padding(.horizontal, DesignTokens.Spacing.base)
        .background(
            isFocused
                ? DesignTokens.Glass.bgMedium
                : DesignTokens.Glass.bgLight
        )
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .stroke(
                    isFocused
                        ? DesignTokens.Glass.borderFocus
                        : DesignTokens.Glass.borderLight,
                    lineWidth: isFocused ? 2 : 1
                )
        )
        .animation(.easeInOut(duration: 0.2), value: isFocused)
    }
}
