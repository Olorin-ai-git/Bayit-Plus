import BayitDesignSystem
import SwiftUI

// MARK: - Focus Tracking Preference Key

/// Tracks whether any button in the control bar has focus.
/// Used by TVPlayerView to pause the auto-hide timer.
struct ControlBarFocusKey: PreferenceKey {
    static var defaultValue: Bool = false
    static func reduce(value: inout Bool, nextValue: () -> Bool) {
        value = value || nextValue()
    }
}

// MARK: - Player Control Button Style

/// Custom button style for player dock items.
/// Transparent background with dark purple border on focus,
/// replacing the default `.card` style that adds an opaque background.
struct PlayerControlButtonStyle: ButtonStyle {
    @Environment(\.isFocused) private var isFocused

    func makeBody(configuration: Configuration) -> some View {
        PlayerControlButtonContent(
            configuration: configuration,
            isPressed: configuration.isPressed
        )
    }
}

// MARK: - Player Control Button Content

struct PlayerControlButtonContent: View {
    let configuration: ButtonStyleConfiguration
    let isPressed: Bool
    @Environment(\.isFocused) private var isFocused

    var body: some View {
        configuration.label
            .focusEffectDisabled()
            .padding(TVDesignTokens.Spacing.sm)
            .background(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                    .fill(Color.clear)
            )
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                    .stroke(
                        isFocused ? DesignTokens.Glass.borderFocus : Color.clear,
                        lineWidth: TVDesignTokens.Focus.ringWidth
                    )
            )
            .scaleEffect(isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0)
            .scaleEffect(isPressed ? 0.95 : 1.0)
            .shadow(
                color: isFocused
                    ? DesignTokens.Glass.purpleGlow : Color.clear,
                radius: TVDesignTokens.Focus.shadowRadius,
                x: 0,
                y: isFocused ? 8 : 0
            )
            .animation(
                .spring(duration: TVDesignTokens.Focus.animationDuration, bounce: 0.2),
                value: isFocused
            )
            .animation(.easeInOut(duration: 0.1), value: isPressed)
            .preference(key: ControlBarFocusKey.self, value: isFocused)
    }
}
