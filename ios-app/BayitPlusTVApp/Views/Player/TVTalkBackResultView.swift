#if os(tvOS)
import BayitDesignSystem
import SwiftUI

/// tvOS-specific result display for Talk Back evaluation.
/// Shows stars, score, points, Hebrew feedback, and action buttons.
struct TVTalkBackResultView: View {

    let evaluation: TalkBackEvaluation
    let onTryAgain: () -> Void
    let onContinue: () -> Void

    private let maxStars = 5

    private var starCount: Int {
        Int(round(Double(evaluation.score) / 100.0 * Double(maxStars)))
    }

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            starsRow
            scoreRow
            pointsLabel
            feedbackLabel
            actionButtons
        }
    }

    private var starsRow: some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            ForEach(0..<maxStars, id: \.self) { index in
                Image(systemName: index < starCount ? "star.fill" : "star")
                    .foregroundStyle(DesignTokens.gold)
                    .font(.system(size: TVDesignTokens.FontSize.xl))
            }
        }
    }

    private var scoreRow: some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            Text("\(evaluation.score)")
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .heavy))
                .foregroundStyle(DesignTokens.gold)
            Text("/ 100")
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    private var pointsLabel: some View {
        Text("+\(evaluation.pointsEarned) points")
            .font(.system(size: TVDesignTokens.FontSize.md, weight: .bold))
            .foregroundStyle(DesignTokens.Success.s400)
    }

    private var feedbackLabel: some View {
        Text(evaluation.feedbackHe)
            .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
            .foregroundStyle(DesignTokens.Text.primary)
            .multilineTextAlignment(.center)
            .environment(\.layoutDirection, .rightToLeft)
    }

    private var actionButtons: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            GlassButton("Try Again", variant: .ghost, size: .large) {
                onTryAgain()
            }
            .tvFocusStyle()

            GlassButton("Continue", variant: .primary, size: .large) {
                onContinue()
            }
            .tvFocusStyle()
        }
    }
}
#endif
