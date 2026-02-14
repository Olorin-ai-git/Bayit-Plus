import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Large Trending News widget: full summary + 5+ topics.
struct TrendingNewsLargeView: View {
    let entry: TrendingNewsEntry

    private var displayTopics: [SharedTrendingTopic] {
        guard let summary = entry.summary else { return [] }
        return Array(summary.topics.prefix(6))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            // Header
            HStack {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Primary.p400)
                Text("Trending News")
                    .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .accessibilityAddTraits(.isHeader)
                Spacer()
                Link(destination: WidgetDeepLinks.trending) {
                    Text("See All")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
                .frame(minWidth: 44, minHeight: 44)
                .accessibilityLabel("See all trending news")
                .accessibilityHint("Opens trending news section")
            }

            if let summary = entry.summary {
                // Top story card
                Link(destination: WidgetDeepLinks.trending) {
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                        Text("Top Story")
                            .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                            .foregroundStyle(DesignTokens.Primary.p400)
                        Text(summary.topStory)
                            .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .lineLimit(3)
                    }
                    .padding(DesignTokens.Spacing.sm)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .frame(minWidth: 44, minHeight: 44)
                    .background(
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                            .fill(DesignTokens.Glass.bg)
                    )
                }
                .accessibilityLabel("Top trending story: \(summary.topStory)")
                .accessibilityHint("Opens trending news section")

                // Mood
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Text("Overall Mood:")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                    Text(summary.overallMood.capitalized)
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .padding(.horizontal, DesignTokens.Spacing.xs)
                        .padding(.vertical, 2)
                        .background(
                            Capsule().fill(DesignTokens.Glass.bg)
                        )
                    Spacer()
                    Text(formattedTime(summary.lastUpdated))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                .accessibilityElement(children: .combine)
                .accessibilityLabel("Overall mood: \(summary.overallMood), updated \(formattedTime(summary.lastUpdated))")

                // Topics
                if !displayTopics.isEmpty {
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                        Text("Topics")
                            .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.secondary)

                        ForEach(displayTopics) { topic in
                            topicRow(topic)
                        }
                    }
                }
            } else {
                Spacer()
                emptyState
                Spacer()
            }
        }
        .padding(DesignTokens.Spacing.base)
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [DesignTokens.Background.primary, DesignTokens.Background.elevated],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    private func topicRow(_ topic: SharedTrendingTopic) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Circle()
                .fill(importanceColor(topic.importance))
                .frame(width: 8, height: 8)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 1) {
                Text(topic.title)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)
                Text(topic.category)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            Spacer()
            importanceBadge(topic.importance)
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(topic.title), \(topic.category), importance \(topic.importance)")
    }

    private func importanceBadge(_ importance: Int) -> some View {
        Text("\(importance)")
            .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
            .foregroundStyle(importanceColor(importance))
            .frame(width: 24, height: 24)
            .background(
                Circle().fill(importanceColor(importance).opacity(0.15))
            )
            .accessibilityHidden(true)
    }

    private func importanceColor(_ importance: Int) -> Color {
        switch importance {
        case 8...10: return DesignTokens.Colors.Semantic.error
        case 5...7: return DesignTokens.Primary.p400
        default: return DesignTokens.Text.muted
        }
    }

    private func formattedTime(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: .now)
    }

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "chart.line.uptrend.xyaxis")
                .font(.system(size: DesignTokens.FontSize.xxxl))
                .foregroundStyle(DesignTokens.Text.muted)
            Text("No trending data")
                .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)
            Text("Trending stories will appear here")
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity)
    }
}
