import BayitDesignSystem
import SwiftUI
import UIKit

/// Horizontal chips for playback speed selection: 0.5x through 2.0x
struct PlaybackSpeedControlView: View {
    let currentSpeed: Float
    let onSpeedSelected: (Float) -> Void

    private let speeds: [Float] = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(speeds, id: \.self) { speed in
                    let isSelected = abs(currentSpeed - speed) < 0.01

                    GlassChip(
                        title: speedLabel(speed),
                        isSelected: isSelected
                    ) {
                        let generator = UIImpactFeedbackGenerator(style: .light)
                        generator.impactOccurred()
                        onSpeedSelected(speed)
                    }
                }
            }
        }
    }

    private func speedLabel(_ speed: Float) -> String {
        if speed == Float(Int(speed)) {
            return String(format: "%.0fx", speed)
        }
        return String(format: "%.2gx", speed)
    }
}
