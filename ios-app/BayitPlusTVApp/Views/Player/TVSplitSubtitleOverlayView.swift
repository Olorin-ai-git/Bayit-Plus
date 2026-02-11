import BayitDesignSystem
import SwiftUI

/// tvOS split subtitle overlay showing two subtitle languages simultaneously.
struct TVSplitSubtitleOverlayView: View {
    let currentTime: TimeInterval
    let primaryCues: [SubtitleCue]
    let secondaryCues: [SubtitleCue]
    let primaryLanguage: String
    let secondaryLanguage: String

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            if let primary = activeCue(from: primaryCues) {
                Text(primary.text ?? "")
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .medium))
                    .foregroundStyle(.white)
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                    .padding(.vertical, TVDesignTokens.Spacing.sm)
                    .background(.black.opacity(0.7))
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
            }

            if let secondary = activeCue(from: secondaryCues) {
                Text(secondary.text ?? "")
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                    .padding(.vertical, TVDesignTokens.Spacing.xs)
                    .background(.black.opacity(0.5))
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.bottom, TVDesignTokens.Spacing.xxxl)
    }

    private func activeCue(from cues: [SubtitleCue]) -> SubtitleCue? {
        cues.first {
            guard let start = $0.startTime, let end = $0.endTime else { return false }
            return currentTime >= start && currentTime <= end
        }
    }
}
