#if os(tvOS)
    import SwiftUI

    /// Applies tvOS focus scale, highlight ring, and shadow on focus.
    /// Uses `.focusable(true)` + `@FocusState` + `.focusEffectDisabled()`
    /// to fully bypass the system white highlight that Button receives.
    public struct TVFocusModifier: ViewModifier {
        @FocusState private var isFocused: Bool

        private let scaleAmount: CGFloat
        private let highlightColor: Color
        private let shadowRadius: CGFloat

        public init(
            scale: CGFloat = TVDesignTokens.Focus.scaleAmount,
            highlightColor: Color = DesignTokens.Glass.borderFocus,
            shadowRadius: CGFloat = TVDesignTokens.Focus.shadowRadius
        ) {
            scaleAmount = scale
            self.highlightColor = highlightColor
            self.shadowRadius = shadowRadius
        }

        public func body(content: Content) -> some View {
            content
                .focusable(true)
                .focused($isFocused)
                .focusEffectDisabled()
                .scaleEffect(isFocused ? scaleAmount : 1.0)
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                        .inset(by: -TVDesignTokens.Focus.ringWidth)
                        .stroke(
                            isFocused ? highlightColor : Color.clear,
                            lineWidth: TVDesignTokens.Focus.ringWidth
                        )
                )
                .shadow(
                    color: isFocused
                        ? DesignTokens.Glass.purpleGlow : Color.clear,
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

    public extension View {
        /// Apply standard tvOS focus behavior: scale, highlight ring, and shadow.
        func tvFocusStyle(
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
