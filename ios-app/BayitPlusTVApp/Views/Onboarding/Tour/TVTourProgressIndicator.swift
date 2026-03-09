import BayitDesignSystem
import SwiftUI

/// TV-sized dot indicator for feature tour progress.
struct TVTourProgressIndicator: View {
    let currentIndex: Int
    let totalCount: Int

    var body: some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            ForEach(0 ..< totalCount, id: \.self) { index in
                Circle()
                    .fill(
                        index == currentIndex
                            ? DesignTokens.Colors.Primary.base
                            : DesignTokens.Glass.bgMedium
                    )
                    .frame(
                        width: index == currentIndex ? 16 : 12,
                        height: index == currentIndex ? 16 : 12
                    )
                    .animation(
                        .easeInOut(duration: TVDesignTokens.Focus.animationDuration),
                        value: currentIndex
                    )
            }
        }
        .accessibilityElement()
        .accessibilityLabel("Card \(currentIndex + 1) of \(totalCount)")
    }
}
