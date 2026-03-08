#if os(tvOS)
    import SwiftUI

    /// ButtonStyle that replaces the system white focus highlight with a purple
    /// border ring, glow shadow, and spring-animated scale.
    ///
    /// Uses `@Environment(\.isFocused)` inside a ButtonStyle so the Button
    /// itself remains the focus target and its action fires on press.
    /// The previous `.focusable(true)` + `@FocusState` pattern created a
    /// competing focus wrapper that intercepted events.
    private struct TVCardInternalButtonStyle: ButtonStyle {
        @Environment(\.isFocused) private var isFocused

        func makeBody(configuration: Configuration) -> some View {
            configuration.label
                .scaleEffect(
                    isFocused
                        ? TVDesignTokens.Focus.scaleAmount
                        : (configuration.isPressed ? 0.97 : 1.0)
                )
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
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
                .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
        }
    }

    public extension View {
        /// Replaces the tvOS system focus highlight with a purple focus ring + glow.
        /// Uses a proper ButtonStyle so the Button action fires correctly on press.
        func tvCardStyle() -> some View {
            buttonStyle(TVCardInternalButtonStyle())
                .focusEffectDisabled()
        }
    }
#endif
