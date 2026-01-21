import SwiftUI

/// Waveform visualizer showing audio input levels
struct WaveformVisualizer: View {
    let audioLevel: Float
    private let barCount = 25
    private let barSpacing: CGFloat = 4

    var body: some View {
        GeometryReader { geometry in
            HStack(alignment: .center, spacing: barSpacing) {
                ForEach(0..<barCount, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(barColor(for: index))
                        .frame(width: barWidth(geometry: geometry), height: barHeight(for: index, geometry: geometry))
                        .animation(.easeInOut(duration: 0.1), value: audioLevel)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .frame(height: 80)
    }

    // MARK: - Private Helpers

    /// Calculate bar width based on available space
    private func barWidth(geometry: GeometryProxy) -> CGFloat {
        let totalSpacing = barSpacing * CGFloat(barCount - 1)
        let availableWidth = geometry.size.width - totalSpacing
        return availableWidth / CGFloat(barCount)
    }

    /// Calculate bar height based on audio level and position
    private func barHeight(for index: Int, geometry: GeometryProxy) -> CGFloat {
        let maxHeight = geometry.size.height
        let minHeight: CGFloat = 4

        // Create wave effect based on audio level
        let normalizedIndex = Float(index) / Float(barCount)
        let wave = sin(normalizedIndex * .pi)

        let level = audioLevel * wave
        let height = CGFloat(level) * maxHeight

        return max(minHeight, height)
    }

    /// Bar color based on position and level
    private func barColor(for index: Int) -> Color {
        let intensity = audioLevel
        let centerDistance = abs(Float(index) - Float(barCount) / 2.0) / Float(barCount)

        if intensity > 0.7 {
            return Color.red.opacity(1.0 - Double(centerDistance))
        } else if intensity > 0.4 {
            return Color.orange.opacity(1.0 - Double(centerDistance))
        } else {
            return Color.blue.opacity(0.6 - Double(centerDistance) * 0.3)
        }
    }
}

// MARK: - Preview

#Preview {
    VStack {
        WaveformVisualizer(audioLevel: 0.3)
            .padding()
            .background(Color.black)

        WaveformVisualizer(audioLevel: 0.7)
            .padding()
            .background(Color.black)

        WaveformVisualizer(audioLevel: 1.0)
            .padding()
            .background(Color.black)
    }
}
