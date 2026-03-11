import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Displays evaluation results after a Talk Back voice response.
/// Shows star rating, score, points earned, and encouraging feedback.
struct TalkBackResultView: View {
    @Environment(LocalizationManager.self) private var localization
    let evaluation: TalkBackEvaluation
    let onTryAgain: () -> Void
    let onContinue: () -> Void

    private let maxStars = 5

    @State private var showContent = false

    private var starCount: Int {
        Int(round(Double(evaluation.score) / 100.0 * Double(maxStars)))
    }

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.base) {
            starsRow
            scoreDisplay
            pointsEarnedLabel
            feedbackLabel
            actionButtons
        }
        .scaleEffect(showContent ? 1 : 0.5)
        .opacity(showContent ? 1 : 0)
        .onAppear {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
                showContent = true
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Score \(evaluation.score) out of 100. \(evaluation.pointsEarned) points earned.")
    }

    private var starsRow: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            ForEach(0 ..< maxStars, id: \.self) { index in
                Image(systemName: index < starCount ? "star.fill" : "star")
                    .foregroundStyle(DesignTokens.gold)
                    .font(.system(size: DesignTokens.FontSize.xl))
            }
        }
    }

    private var scoreDisplay: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            Text("\(evaluation.score)")
                .font(.system(size: DesignTokens.FontSize.xxl, weight: .heavy))
                .foregroundStyle(DesignTokens.gold)

            Text("/ 100")
                .font(.system(size: DesignTokens.FontSize.base, weight: .medium))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    private var pointsEarnedLabel: some View {
        Text("+\(evaluation.pointsEarned) \(localization.t("leaderboard.points"))")
            .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
            .foregroundStyle(DesignTokens.Success.s400)
    }

    private var feedbackLabel: some View {
        Text(evaluation.feedbackHe)
            .font(.system(size: DesignTokens.FontSize.base, weight: .medium))
            .foregroundStyle(DesignTokens.Text.primary)
            .multilineTextAlignment(.center)
            .environment(\.layoutDirection, .rightToLeft)
    }

    private var actionButtons: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            GlassButton(localization.t("common.tryAgain"), variant: .ghost, size: .small) {
                onTryAgain()
            }

            GlassButton(localization.t("common.continue"), variant: .primary, size: .small) {
                onContinue()
            }
        }
    }
}
