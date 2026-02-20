import BayitDesignSystem
import SwiftUI

/// Auto-hiding transparent playback control buttons overlay for tvOS player.
/// Visibility is driven by the parent. Uses .focusSection() so the tvOS focus
/// engine can navigate into the buttons from the control bar below.
struct TVPlaybackControlsOverlay: View {
    let isPlaying: Bool
    let hasChapters: Bool
    let onPlayPause: () -> Void
    let onSkipBackward30: () -> Void
    let onSkipForward30: () -> Void
    let onPreviousChapter: () -> Void
    let onNextChapter: () -> Void
    let onInteraction: () -> Void

    var body: some View {
        HStack(spacing: TVDesignTokens.Spacing.xxl) {
            if hasChapters {
                TVOverlayButton(
                    icon: "backward.end.fill",
                    accessibilityLabel: "Previous chapter",
                    action: { onInteraction(); onPreviousChapter() }
                )
            }

            TVOverlayButton(
                icon: "gobackward.30",
                accessibilityLabel: "Skip backward 30 seconds",
                action: { onInteraction(); onSkipBackward30() }
            )

            TVOverlayButton(
                icon: isPlaying ? "pause.fill" : "play.fill",
                isLarge: true,
                accessibilityLabel: isPlaying ? "Pause" : "Play",
                action: { onInteraction(); onPlayPause() }
            )

            TVOverlayButton(
                icon: "goforward.30",
                accessibilityLabel: "Skip forward 30 seconds",
                action: { onInteraction(); onSkipForward30() }
            )

            if hasChapters {
                TVOverlayButton(
                    icon: "forward.end.fill",
                    accessibilityLabel: "Next chapter",
                    action: { onInteraction(); onNextChapter() }
                )
            }
        }
        .padding(TVDesignTokens.Spacing.xl)
        .background(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .fill(.ultraThinMaterial)
                .opacity(0.3)
        )
    }
}

/// Individual focusable button for the playback overlay.
/// Uses .buttonStyle(.card) so the tvOS focus engine properly handles it,
/// with a transparent appearance via the custom style.
private struct TVOverlayButton: View {
    let icon: String
    var label: String? = nil
    var isLarge: Bool = false
    let accessibilityLabel: String
    let action: () -> Void

    @FocusState private var isFocused: Bool

    var body: some View {
        Button(action: action) {
            if let label {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: icon)
                        .font(.system(size: TVDesignTokens.FontSize.xl, weight: .medium))
                    Text(label)
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(
                    Capsule()
                        .fill(.white.opacity(isFocused ? 0.25 : 0.10))
                )
            } else {
                Image(systemName: icon)
                    .font(.system(
                        size: isLarge ? TVDesignTokens.FontSize.hero : TVDesignTokens.FontSize.xxxl,
                        weight: .medium
                    ))
                    .foregroundStyle(.white)
                    .frame(
                        width: isLarge ? 120 : 80,
                        height: isLarge ? 120 : 80
                    )
                    .background(
                        Circle()
                            .fill(.white.opacity(isFocused ? 0.30 : (isLarge ? 0.15 : 0.10)))
                    )
            }
        }
        .buttonStyle(.plain)
        .focusable(true)
        .focused($isFocused)
        .scaleEffect(isFocused ? 1.15 : 1.0)
        .shadow(
            color: isFocused ? .white.opacity(0.5) : .clear,
            radius: isFocused ? 24 : 0
        )
        .animation(.spring(duration: 0.25, bounce: 0.2), value: isFocused)
        .accessibilityLabel(accessibilityLabel)
    }
}
