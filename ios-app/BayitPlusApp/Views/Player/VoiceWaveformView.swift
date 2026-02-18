import BayitDesignSystem
import SwiftUI

/// Animated waveform bars indicating voice activity in the player overlay.
struct VoiceWaveformView: View {
    let isActive: Bool

    private let barCount = 12
    private let minHeight: CGFloat = 4
    private let maxHeight: CGFloat = 32
    private let animationInterval: TimeInterval = 0.15

    @State private var barHeights: [CGFloat] = []
    @State private var animationTask: Task<Void, Never>?

    var body: some View {
        HStack(alignment: .center, spacing: DesignTokens.Spacing.xxs) {
            ForEach(0 ..< barCount, id: \.self) { index in
                Rectangle()
                    .fill(isActive ? DesignTokens.Primary.p400 : DesignTokens.Text.disabled)
                    .frame(width: 3, height: barHeights.indices.contains(index) ? barHeights[index] : minHeight)
                    .clipShape(RoundedRectangle(cornerRadius: 1.5))
                    .animation(.easeInOut(duration: animationInterval), value: barHeights)
            }
        }
        .frame(height: maxHeight)
        .accessibilityLabel(isActive ? "Voice activity detected" : "Voice inactive")
        .onAppear { initializeHeights() }
        .onChange(of: isActive) { _, active in
            if active { startAnimating() } else { stopAnimating() }
        }
    }

    private func initializeHeights() {
        barHeights = Array(repeating: minHeight, count: barCount)
        if isActive { startAnimating() }
    }

    private func startAnimating() {
        animationTask?.cancel()
        animationTask = Task {
            while !Task.isCancelled {
                withAnimation(.easeInOut(duration: animationInterval)) {
                    barHeights = (0 ..< barCount).map { _ in
                        CGFloat.random(in: minHeight ... maxHeight)
                    }
                }
                try? await Task.sleep(for: .seconds(animationInterval))
            }
        }
    }

    private func stopAnimating() {
        animationTask?.cancel()
        animationTask = nil
        withAnimation(.easeInOut(duration: 0.3)) {
            barHeights = Array(repeating: minHeight, count: barCount)
        }
    }
}
