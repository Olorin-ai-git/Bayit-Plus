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
        _text = text
        self.isSecure = isSecure
        self.icon = icon
    }

    public var body: some View {
        HStack(spacing: spacing) {
            if let icon {
                icon
                    .font(.system(size: iconSize))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            if isSecure {
                SecureField(placeholder, text: $text)
                    .focused($isFocused)
                #if os(macOS)
                    .textFieldStyle(.plain)
                #endif
            } else {
                TextField(placeholder, text: $text)
                    .focused($isFocused)
                #if os(macOS)
                    .textFieldStyle(.plain)
                #endif
            }
        }
        .font(.system(size: fontSize))
        .foregroundStyle(DesignTokens.Text.primary)
        .padding(.vertical, verticalPadding)
        .padding(.horizontal, horizontalPadding)
        .background(
            isFocused
                ? DesignTokens.Glass.bgMedium
                : DesignTokens.Glass.bgLight
        )
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
        .overlay(
            RoundedRectangle(cornerRadius: cornerRadius)
                .stroke(
                    isFocused
                        ? DesignTokens.Glass.borderFocus
                        : DesignTokens.Glass.borderLight,
                    lineWidth: isFocused ? 2 : 1
                )
        )
        .animation(.easeInOut(duration: 0.2), value: isFocused)
    }

    // MARK: - Platform-Adaptive Sizing

    private var fontSize: CGFloat {
        #if os(tvOS)
            return TVDesignTokens.FontSize.base
        #else
            return DesignTokens.FontSize.base
        #endif
    }

    private var iconSize: CGFloat {
        #if os(tvOS)
            return TVDesignTokens.FontSize.lg
        #else
            return DesignTokens.FontSize.md
        #endif
    }

    private var spacing: CGFloat {
        #if os(tvOS)
            return TVDesignTokens.Spacing.md
        #else
            return DesignTokens.Spacing.sm
        #endif
    }

    private var verticalPadding: CGFloat {
        #if os(tvOS)
            return TVDesignTokens.Spacing.lg
        #else
            return DesignTokens.Spacing.md
        #endif
    }

    private var horizontalPadding: CGFloat {
        #if os(tvOS)
            return TVDesignTokens.Spacing.xl
        #else
            return DesignTokens.Spacing.base
        #endif
    }

    private var cornerRadius: CGFloat {
        #if os(tvOS)
            return TVDesignTokens.Radius.md
        #else
            return DesignTokens.Radius.md
        #endif
    }
}
