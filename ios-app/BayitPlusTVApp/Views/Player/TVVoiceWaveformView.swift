#if os(tvOS)
import BayitDesignSystem
import SwiftUI

/// Compact waveform visualization for voice activity on tvOS.
/// Renders 7 vertical bars with staggered pulsing animation
/// driven by the `amplitude` value. Designed for player overlay use.
struct TVVoiceWaveformView: View {

    let isActive: Bool
    let amplitude: Double

    private let barCount = 7
    private let barWidth: CGFloat = 4
    private let viewWidth: CGFloat = 60
    private let viewHeight: CGFloat = 40
    private let minBarScale: CGFloat = 0.15
    private let animationDuration: Double = 0.3

    @State private var isAnimating = false

    var body: some View {
        HStack(alignment: .center, spacing: barSpacing) {
            ForEach(0 ..< barCount, id: \.self) { index in
                barView(at: index)
            }
        }
        .frame(width: viewWidth, height: viewHeight)
        .accessibilityLabel(isActive ? "Voice activity detected" : "Voice inactive")
        .accessibilityValue(
            isActive ? "Amplitude \(Int(amplitude * 100)) percent" : ""
        )
        .onChange(of: isActive) { _, active in
            if active {
                withAnimation(
                    .easeInOut(duration: animationDuration)
                    .repeatForever(autoreverses: true)
                ) {
                    isAnimating = true
                }
            } else {
                withAnimation(.easeInOut(duration: animationDuration)) {
                    isAnimating = false
                }
            }
        }
        .onAppear {
            guard isActive else { return }
            withAnimation(
                .easeInOut(duration: animationDuration)
                .repeatForever(autoreverses: true)
            ) {
                isAnimating = true
            }
        }
    }

    // MARK: - Bar View

    private func barView(at index: Int) -> some View {
        let scale = barScale(for: index)
        return RoundedRectangle(cornerRadius: barWidth / 2)
            .fill(isActive ? DesignTokens.Primary.p300 : DesignTokens.Text.muted)
            .frame(width: barWidth, height: viewHeight)
            .scaleEffect(y: scale, anchor: .center)
            .animation(
                .easeInOut(duration: animationDuration)
                .delay(staggerDelay(for: index)),
                value: isAnimating
            )
            .animation(
                .easeInOut(duration: animationDuration),
                value: amplitude
            )
    }

    // MARK: - Scale Calculation

    private func barScale(for index: Int) -> CGFloat {
        guard isActive, isAnimating else { return minBarScale }
        let normalizedAmplitude = CGFloat(min(max(amplitude, 0), 1))
        let centerDistance = abs(CGFloat(index) - CGFloat(barCount - 1) / 2)
        let centerFactor = 1.0 - (centerDistance / CGFloat(barCount))
        let scale = minBarScale
            + (normalizedAmplitude * centerFactor * (1.0 - minBarScale))
        return max(minBarScale, scale)
    }

    private func staggerDelay(for index: Int) -> Double {
        Double(index) * 0.04
    }

    private var barSpacing: CGFloat {
        let totalBarWidth = CGFloat(barCount) * barWidth
        let remaining = viewWidth - totalBarWidth
        return max(TVDesignTokens.Spacing.xxs, remaining / CGFloat(barCount - 1))
    }
}
#endif
