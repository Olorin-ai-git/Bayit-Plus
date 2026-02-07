import SwiftUI

/// Glass-styled search bar with optional voice input
/// Features search icon, clear button, and voice button
public struct GlassSearchBar: View {
    @Binding var text: String
    let placeholder: String
    let showVoiceButton: Bool
    let onVoiceTap: (() -> Void)?

    @FocusState private var isFocused: Bool

    public init(
        text: Binding<String>,
        placeholder: String = "Search...",
        showVoiceButton: Bool = false,
        onVoiceTap: (() -> Void)? = nil
    ) {
        self._text = text
        self.placeholder = placeholder
        self.showVoiceButton = showVoiceButton
        self.onVoiceTap = onVoiceTap
    }

    public var body: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(DesignTokens.Text.secondary)
                .font(.system(size: DesignTokens.FontSize.md))

            TextField(placeholder, text: $text)
                .focused($isFocused)
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.primary)
                .tint(DesignTokens.Primary.default)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)

            if !text.isEmpty {
                Button(action: { text = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(DesignTokens.Text.muted)
                        .font(.system(size: DesignTokens.FontSize.md))
                }
                .transition(.scale.combined(with: .opacity))
            }

            if showVoiceButton {
                Button(action: { onVoiceTap?() }) {
                    Image(systemName: "mic.fill")
                        .foregroundColor(DesignTokens.Primary.default)
                        .font(.system(size: DesignTokens.FontSize.md))
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
        .padding(.vertical, DesignTokens.Spacing.md)
        .background {
            ZStack {
                DesignTokens.Glass.bg
                VisualEffectBlur(style: .systemUltraThinMaterialDark)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .stroke(
                    isFocused ? DesignTokens.Glass.borderFocus : DesignTokens.Glass.border,
                    lineWidth: isFocused ? 1.5 : 1
                )
        )
        .animation(.easeInOut(duration: 0.2), value: isFocused)
        .animation(.easeInOut(duration: 0.2), value: text.isEmpty)
    }
}
