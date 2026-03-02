#if os(tvOS)
    import SwiftUI

    /// ViewModifier that kills the system white focus highlight and replaces
    /// it with a purple border ring, glow shadow, and spring-animated scale.
    ///
    /// Uses the same pattern as TVHeroItem: `.focusable(true)` +
    /// `.focusEffectDisabled()` to fully bypass the system focus decoration
    /// that `Button` normally receives on tvOS.
    public struct TVCardModifier: ViewModifier {
        @FocusState private var isFocused: Bool

        public init() {}

        public func body(content: Content) -> some View {
            content
                .buttonStyle(.plain)
                .focusable(true)
                .focused($isFocused)
                .focusEffectDisabled()
                .scaleEffect(isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0)
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                        .inset(by: -TVDesignTokens.Focus.ringWidth)
                        .stroke(
                            isFocused ? DesignTokens.Glass.borderFocus : Color.clear,
                            lineWidth: TVDesignTokens.Focus.ringWidth
                        )
                )
                .shadow(
                    color: isFocused
                        ? DesignTokens.Glass.purpleGlow : .clear,
                    radius: TVDesignTokens.Focus.shadowRadius,
                    x: 0,
                    y: isFocused ? 8 : 0
                )
                .animation(
                    .spring(
                        duration: TVDesignTokens.Focus.animationDuration,
                        bounce: 0.2
                    ),
                    value: isFocused
                )
        }
    }

    public extension View {
        /// Replaces `.buttonStyle(.card)` with purple focus ring + glow.
        /// Uses `.focusable(true)` + `.focusEffectDisabled()` to fully
        /// bypass the system white highlight that `Button` receives on tvOS.
        func tvCardStyle() -> some View {
            modifier(TVCardModifier())
        }
    }
#endif
