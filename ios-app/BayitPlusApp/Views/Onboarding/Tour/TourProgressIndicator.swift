import BayitDesignSystem
import SwiftUI

/// Horizontal dot indicator showing current card position in the tour.
struct TourProgressIndicator: View {
    let currentIndex: Int
    let totalCount: Int

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            ForEach(0 ..< totalCount, id: \.self) { index in
                Circle()
                    .fill(
                        index == currentIndex
                            ? DesignTokens.Colors.accentPrimary
                            : DesignTokens.Colors.textTertiary
                    )
                    .frame(
                        width: index == currentIndex ? 10 : 8,
                        height: index == currentIndex ? 10 : 8
                    )
                    .animation(
                        .easeInOut(duration: 0.2),
                        value: currentIndex
                    )
            }
        }
        .accessibilityElement()
        .accessibilityLabel("Card \(currentIndex + 1) of \(totalCount)")
    }
}
