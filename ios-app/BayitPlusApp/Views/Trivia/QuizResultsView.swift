import BayitDesignSystem
import SwiftUI
import UIKit

/// Animated quiz results screen showing score, earned badges, and streak info.
struct QuizResultsView: View {
    let result: QuizResult
    let totalQuestions: Int
    let onDismiss: () -> Void

    @State private var scoreAnimated = false
    @State private var badgesVisible = false

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xxl) {
            scoreSection
            statsSection
            badgesSection
            streakSection
            dismissButton
        }
        .padding(DesignTokens.Spacing.xl)
        .task {
            withAnimation(.spring(duration: 0.6, bounce: 0.3).delay(0.2)) {
                scoreAnimated = true
            }
            withAnimation(.easeInOut(duration: 0.4).delay(0.8)) {
                badgesVisible = true
            }
        }
    }

    // MARK: - Score

    private var scoreSection: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Text(scoreEmoji)
                .font(.system(size: 64))
                .scaleEffect(scoreAnimated ? 1.0 : 0.3)
                .accessibilityHidden(true)

            Text("\(result.score ?? 0)/\(result.total ?? totalQuestions)")
                .font(.system(size: DesignTokens.FontSize.hero, weight: .bold))
                .foregroundStyle(scoreColor)
                .scaleEffect(scoreAnimated ? 1.0 : 0.5)
                .accessibilityLabel("Score: \(result.score ?? 0) out of \(result.total ?? totalQuestions)")

            Text(scoreMessage)
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Stats

    private var statsSection: some View {
        HStack(spacing: DesignTokens.Spacing.xl) {
            statItem(
                label: "Points",
                value: "\(result.pointsEarned ?? 0)",
                icon: "star.fill",
                color: DesignTokens.gold
            )
            statItem(
                label: "Correct",
                value: "\(result.score ?? 0)",
                icon: "checkmark.circle.fill",
                color: DesignTokens.Success.default
            )
        }
    }

    private func statItem(label: String, value: String, icon: String, color: Color) -> some View {
        GlassCard(radius: DesignTokens.Radius.md, padding: DesignTokens.Spacing.md) {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: DesignTokens.FontSize.xl))
                    .foregroundStyle(color)
                    .accessibilityHidden(true)

                Text(value)
                    .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(label)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .frame(maxWidth: .infinity)
            .accessibilityElement(children: .combine)
            .accessibilityLabel("\(label): \(value)")
        }
    }

    // MARK: - Badges

    @ViewBuilder
    private var badgesSection: some View {
        if let badges = result.badges, !badges.isEmpty {
            VStack(spacing: DesignTokens.Spacing.md) {
                Text("Badges Earned")
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                HStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(badges, id: \.self) { badge in
                        GlassBadge(text: badge, variant: .primary)
                    }
                }
                .opacity(badgesVisible ? 1 : 0)
                .offset(y: badgesVisible ? 0 : 10)
            }
        }
    }

    // MARK: - Streak

    @ViewBuilder
    private var streakSection: some View {
        if let streak = result.streakDays, streak > 0 {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "flame.fill")
                    .foregroundStyle(DesignTokens.Warning.default)
                    .accessibilityHidden(true)

                Text("\(streak) day streak")
                    .font(.system(size: DesignTokens.FontSize.base, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
            .padding(.vertical, DesignTokens.Spacing.sm)
            .padding(.horizontal, DesignTokens.Spacing.base)
            .glassCard(radius: DesignTokens.Radius.xl, padding: DesignTokens.Spacing.sm)
            .accessibilityLabel("Streak: \(streak) days")
        }
    }

    // MARK: - Dismiss

    private var dismissButton: some View {
        GlassButton("Done", variant: .primary, size: .large) {
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.impactOccurred()
            onDismiss()
        }
    }

    // MARK: - Helpers

    private var scorePercentage: Double {
        let total = Double(result.total ?? totalQuestions)
        guard total > 0 else { return 0 }
        return Double(result.score ?? 0) / total
    }

    private var scoreColor: Color {
        if scorePercentage >= 0.8 { return DesignTokens.Success.default }
        if scorePercentage >= 0.5 { return DesignTokens.Warning.default }
        return DesignTokens.ErrorColor.default
    }

    private var scoreEmoji: String {
        if scorePercentage >= 0.8 { return "\u{1F3C6}" }
        if scorePercentage >= 0.5 { return "\u{1F44D}" }
        return "\u{1F4AA}"
    }

    private var scoreMessage: String {
        if scorePercentage >= 0.8 { return "Outstanding performance!" }
        if scorePercentage >= 0.5 { return "Good effort! Keep learning." }
        return "Keep trying! You will improve."
    }
}
