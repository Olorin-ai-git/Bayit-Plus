import SwiftUI

/// Glass-styled text field matching the @bayit/glass GlassInput component
public struct GlassTextField: View {
    let placeholder: String
    @Binding var text: String
    let isSecure: Bool
    let icon: Image?
    let errorMessage: String?
    @FocusState private var isFocused: Bool
    @State private var isPasswordVisible: Bool = false

    public init(
        _ placeholder: String,
        text: Binding<String>,
        isSecure: Bool = false,
        icon: Image? = nil,
        errorMessage: String? = nil
    ) {
        self.placeholder = placeholder
        _text = text
        self.isSecure = isSecure
        self.icon = icon
        self.errorMessage = errorMessage
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            if let errorMessage {
                errorTooltip(errorMessage)
            }
            fieldContent
        }
    }

    private var fieldContent: some View {
        HStack(spacing: spacing) {
            if let icon {
                icon
                    .font(.system(size: iconSize))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            if isSecure && !isPasswordVisible {
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
            if isSecure {
                Button { isPasswordVisible.toggle() } label: {
                    Image(systemName: isPasswordVisible ? "eye.slash" : "eye")
                        .font(.system(size: iconSize))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                .buttonStyle(.plain)
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
                    errorMessage != nil
                        ? DesignTokens.ErrorColor.default
                        : (isFocused
                            ? DesignTokens.Glass.borderFocus
                            : DesignTokens.Glass.borderLight),
                    lineWidth: (isFocused || errorMessage != nil) ? 2 : 1
                )
        )
        .animation(.easeInOut(duration: 0.2), value: isFocused)
    }

    private func errorTooltip(_ message: String) -> some View {
        Text(message)
            .font(.system(size: DesignTokens.FontSize.xs))
            .foregroundStyle(.white)
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.xs)
            .background(DesignTokens.ErrorColor.default)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
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
