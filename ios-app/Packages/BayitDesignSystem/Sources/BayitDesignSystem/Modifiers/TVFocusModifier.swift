#if os(tvOS)
import SwiftUI

/// Applies tvOS focus scale, highlight ring, and shadow on focus.
/// Uses `@Environment(\.isFocused)` for automatic focus state detection.
public struct TVFocusModifier: ViewModifier {
    @Environment(\.isFocused) private var isFocused

    private let scaleAmount: CGFloat
    private let highlightColor: Color
    private let shadowRadius: CGFloat

    public init(
        scale: CGFloat = TVDesignTokens.Focus.scaleAmount,
        highlightColor: Color = DesignTokens.Glass.borderFocus,
        shadowRadius: CGFloat = TVDesignTokens.Focus.shadowRadius
    ) {
        self.scaleAmount = scale
        self.highlightColor = highlightColor
        self.shadowRadius = shadowRadius
    }

    public func body(content: Content) -> some View {
        content
            .scaleEffect(isFocused ? scaleAmount : 1.0)
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                    .stroke(
                        isFocused ? highlightColor : Color.clear,
                        lineWidth: TVDesignTokens.Focus.ringWidth
                    )
            )
            .shadow(
                color: isFocused
                    ? DesignTokens.Glass.purpleGlow.opacity(0.6)
                    : Color.clear,
                radius: shadowRadius,
                x: 0,
                y: isFocused ? 8 : 0
            )
            .animation(
                .spring(duration: TVDesignTokens.Focus.animationDuration, bounce: 0.2),
                value: isFocused
            )
    }
}

extension View {
    /// Apply standard tvOS focus behavior: scale, highlight ring, and shadow.
    public func tvFocusStyle(
        scale: CGFloat = TVDesignTokens.Focus.scaleAmount,
        highlightColor: Color = DesignTokens.Glass.borderFocus,
        shadowRadius: CGFloat = TVDesignTokens.Focus.shadowRadius
    ) -> some View {
        modifier(TVFocusModifier(
            scale: scale,
            highlightColor: highlightColor,
            shadowRadius: shadowRadius
        ))
    }
}
#endif
