import BayitDesignSystem
import SwiftUI

/// tvOS playback speed selector: horizontal row of focusable GlassChip buttons.
/// Speeds range from 0.5x to 2.0x with a "Playback Speed" header.
struct TVPlaybackSpeedControlView: View {
    let currentSpeed: Float
    let onSpeedSelected: (Float) -> Void
    var onDismiss: (() -> Void)?

    private let speeds: [Float] = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text("Playback Speed")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(speeds, id: \.self) { speed in
                    let isSelected = abs(currentSpeed - speed) < 0.01

                    GlassChip(
                        title: speedLabel(speed),
                        isSelected: isSelected
                    ) {
                        onSpeedSelected(speed)
                    }
                    .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
                }
            }
        }
        .onExitCommand { onDismiss?() }
    }

    private func speedLabel(_ speed: Float) -> String {
        if speed == Float(Int(speed)) {
            return String(format: "%.0fx", speed)
        }
        return String(format: "%.2gx", speed)
    }
}
