import BayitDesignSystem
import SwiftUI

// MARK: - Focus-Tracking Card Style

/// Card-like button style that reports focus state via `ControlBarFocusKey`
/// so the player overlay auto-hide timer pauses while the panel is focused.
struct AIFeatureCardStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        AIFeatureCardContent(
            configuration: configuration,
            isPressed: configuration.isPressed
        )
    }
}

struct AIFeatureCardContent: View {
    let configuration: ButtonStyleConfiguration
    let isPressed: Bool
    @Environment(\.isFocused) private var isFocused

    var body: some View {
        configuration.label
            .padding(TVDesignTokens.Spacing.sm)
            .background(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                    .fill(isFocused ? Color.white.opacity(0.15) : Color.clear)
            )
            .scaleEffect(isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0)
            .scaleEffect(isPressed ? 0.95 : 1.0)
            .shadow(
                color: isFocused
                    ? Color.black.opacity(0.4)
                    : Color.clear,
                radius: isFocused ? TVDesignTokens.Focus.shadowRadius : 0,
                x: 0,
                y: isFocused ? 5 : 0
            )
            .animation(
                .spring(duration: TVDesignTokens.Focus.animationDuration, bounce: 0.2),
                value: isFocused
            )
            .animation(.easeInOut(duration: 0.1), value: isPressed)
            .preference(key: ControlBarFocusKey.self, value: isFocused)
    }
}
