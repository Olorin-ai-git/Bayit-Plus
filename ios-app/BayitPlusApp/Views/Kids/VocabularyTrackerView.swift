import BayitDesignSystem
import SwiftUI

/// Parent dashboard displaying Hebrew vocabulary learning progress.
/// Shows level badge, word counts, Hebrew ratio, and vocabulary chips.
struct VocabularyTrackerView: View {
    @Bindable var viewModel: BilingualDubbingViewModel
    let profileId: String

    private let levelOrder = ["beginner", "elementary", "intermediate", "advanced"]

    var body: some View {
        ScrollView {
            VStack(spacing: DesignTokens.Spacing.lg) {
                if viewModel.isLoading && viewModel.proficiency == nil {
                    loadingState
                } else if let proficiency = viewModel.proficiency {
                    dashboardContent(proficiency)
                }
            }
            .padding(DesignTokens.Spacing.base)
        }
        .task {
            await viewModel.fetchProficiency(profileId: profileId)
        }
    }

    // MARK: - Loading

    private var loadingState: some View {
        GlassCard {
            ProgressView()
                .tint(DesignTokens.Text.secondary)
                .frame(maxWidth: .infinity, minHeight: 100)
        }
    }

    // MARK: - Dashboard

    private func dashboardContent(_ proficiency: ProficiencyStatus) -> some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            // Level + Progress
            GlassCard {
                VStack(spacing: DesignTokens.Spacing.md) {
                    levelBadge(proficiency)
                    levelProgress(proficiency)
                }
            }

            // Word Counts
            GlassCard {
                HStack(spacing: DesignTokens.Spacing.lg) {
                    statColumn(
                        value: proficiency.vocabularyKnownCount,
                        label: "Known",
                        color: DesignTokens.Success.default
                    )

                    Rectangle()
                        .fill(Color.white.opacity(0.1))
                        .frame(width: 1)

                    statColumn(
                        value: proficiency.vocabularyLearningCount,
                        label: "Learning",
                        color: DesignTokens.Info.default
                    )
                }
                .frame(maxWidth: .infinity)
            }

            // Hebrew Ratio
            GlassCard {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    Text("Hebrew Ratio")
                        .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    LanguageRatioView(hebrewRatio: proficiency.hebrewRatio)
                }
            }

            // Total Words
            totalWordsCard(proficiency)
        }
    }

    // MARK: - Level Badge

    private func levelBadge(_ proficiency: ProficiencyStatus) -> some View {
        HStack {
            GlassBadge(
                text: proficiency.level,
                variant: levelVariant(proficiency.level)
            )
            Spacer()
            Text("\(proficiency.totalWordsLearned) words")
                .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    // MARK: - Level Progress

    private func levelProgress(_ proficiency: ProficiencyStatus) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(levelOrder, id: \.self) { level in
                let isCurrent = proficiency.level == level
                let currentIdx = levelOrder.firstIndex(of: proficiency.level) ?? 0
                let levelIdx = levelOrder.firstIndex(of: level) ?? 0
                let isPassed = levelIdx <= currentIdx

                VStack(spacing: DesignTokens.Spacing.xs) {
                    Circle()
                        .fill(isPassed ? DesignTokens.Primary.default : Color.white.opacity(0.15))
                        .frame(
                            width: isCurrent ? 14 : 10,
                            height: isCurrent ? 14 : 10
                        )
                        .overlay {
                            if isCurrent {
                                Circle()
                                    .stroke(DesignTokens.Primary.light, lineWidth: 2)
                            }
                        }

                    Text(level.prefix(3).uppercased())
                        .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                        .foregroundStyle(isPassed ? DesignTokens.Text.primary : DesignTokens.Text.muted)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Level: \(proficiency.level)")
    }

    // MARK: - Stat Column

    private func statColumn(value: Int, label: String, color: Color) -> some View {
        VStack(spacing: DesignTokens.Spacing.xs) {
            Text("\(value)")
                .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(color)
            Text(label)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(value) \(label)")
    }

    // MARK: - Total Words Card

    private func totalWordsCard(_ proficiency: ProficiencyStatus) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Text("\(proficiency.totalWordsLearned)")
                    .font(.system(size: DesignTokens.FontSize.display, weight: .heavy))
                    .foregroundStyle(DesignTokens.Text.primary)
                Text("Total Words Learned")
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
                Text("Score: \(Int(proficiency.overallScore))/100")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Primary.light)
            }
            .frame(maxWidth: .infinity)
        }
    }

    // MARK: - Helpers

    private func levelVariant(_ level: String) -> GlassBadge.Variant {
        switch level {
        case "beginner": return .primary
        case "elementary": return .info
        case "intermediate": return .warning
        case "advanced": return .success
        default: return .primary
        }
    }
}
