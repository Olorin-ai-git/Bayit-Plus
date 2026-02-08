import BayitDesignSystem
import SwiftUI

/// Segmented progress bar showing quiz advancement - filled segments
/// for completed questions, current segment highlighted.
struct QuizProgressView: View {
    let currentIndex: Int
    let total: Int

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            ForEach(0..<total, id: \.self) { index in
                segmentView(for: index)
                    .accessibilityHidden(true)
            }
        }
        .frame(height: 6)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Question \(currentIndex + 1) of \(total)")
        .accessibilityValue("\(Int(Double(currentIndex + 1) / Double(max(total, 1)) * 100)) percent complete")
    }

    private func segmentView(for index: Int) -> some View {
        Capsule()
            .fill(segmentColor(for: index))
            .frame(height: 6)
            .animation(.easeInOut(duration: 0.3), value: currentIndex)
    }

    private func segmentColor(for index: Int) -> Color {
        if index < currentIndex {
            return DesignTokens.Primary.default
        } else if index == currentIndex {
            return DesignTokens.Primary.p400
        } else {
            return DesignTokens.Glass.bgMedium
        }
    }
}
