import SwiftUI
import BayitDesignSystem

/// Non-interactive progress bar for widgets.
///
/// Renders a compact track with a filled portion. Does not support
/// gestures since WidgetKit views are non-interactive.
struct WidgetProgressBar: View {

    /// Progress value from 0.0 to 1.0.
    let progress: Double

    /// Height of the progress bar track.
    var height: CGFloat = DesignTokens.Spacing.xs

    var body: some View {
        GeometryReader { geometry in
            let width = geometry.size.width

            ZStack(alignment: .leading) {
                // Track background
                Capsule()
                    .fill(DesignTokens.Glass.bgMedium)
                    .frame(height: height)

                // Progress fill
                Capsule()
                    .fill(DesignTokens.Primary.default)
                    .frame(
                        width: max(0, width * clampedProgress),
                        height: height
                    )
            }
        }
        .frame(height: height)
    }

    // MARK: - Private

    private var clampedProgress: CGFloat {
        CGFloat(min(max(progress, 0), 1))
    }
}
