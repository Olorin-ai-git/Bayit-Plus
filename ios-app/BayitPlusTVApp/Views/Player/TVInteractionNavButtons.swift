import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Previous / Next Interaction buttons shown alongside the dialogue
/// button when the current movie has interactive moments.
struct TVInteractionNavButtons: View {
    @Environment(LocalizationManager.self) private var localization

    let moments: [InteractiveMoment]
    let currentTime: TimeInterval
    let onSeek: (TimeInterval) -> Void

    // 3-second threshold prevents re-triggering the current moment
    private let rewindThreshold: TimeInterval = 3
    // Seek to 5 seconds before the moment so users see the lead-in
    private let seekOffset: TimeInterval = 5

    private var sorted: [InteractiveMoment] {
        moments.sorted { $0.timestamp < $1.timestamp }
    }

    private var previousMoment: InteractiveMoment? {
        sorted.last { $0.timestamp < currentTime - rewindThreshold }
    }

    private var nextMoment: InteractiveMoment? {
        sorted.first { $0.timestamp > currentTime }
    }

    var body: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            if let prev = previousMoment {
                navButton(
                    icon: "backward.end.fill",
                    label: localization.t("player.interaction.previous"),
                    moment: prev
                )
            }

            if let next = nextMoment {
                navButton(
                    icon: "forward.end.fill",
                    label: localization.t("player.interaction.next"),
                    moment: next
                )
            }
        }
        .focusSection()
    }

    @ViewBuilder
    private func navButton(
        icon: String,
        label: String,
        moment: InteractiveMoment
    ) -> some View {
        Button {
            let target = max(0, moment.timestamp - seekOffset)
            onSeek(target)
        } label: {
            VStack(spacing: TVDesignTokens.Spacing.xs) {
                Image(systemName: icon)
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                Text(label)
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                    .lineLimit(1)
            }
            .foregroundStyle(.white)
        }
        .accessibilityLabel(label)
    }
}
