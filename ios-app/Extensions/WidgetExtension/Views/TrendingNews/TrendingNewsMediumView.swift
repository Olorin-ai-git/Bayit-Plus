import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Medium Trending News widget: top story + 2-3 topics.
struct TrendingNewsMediumView: View {
    let entry: TrendingNewsEntry

    private var displayTopics: [SharedTrendingTopic] {
        guard let summary = entry.summary else { return [] }
        return Array(summary.topics.prefix(3))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            // Header
            HStack {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Primary.p400)
                Text("Trending")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Spacer()
                if let summary = entry.summary {
                    Text(formattedTime(summary.lastUpdated))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }

            if let summary = entry.summary {
                HStack(alignment: .top, spacing: DesignTokens.Spacing.md) {
                    // Top story
                    Link(destination: WidgetDeepLinks.trending) {
                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                            Text("Top Story")
                                .font(.system(size: DesignTokens.FontSize.xs))
                                .foregroundStyle(DesignTokens.Primary.p400)
                            Text(summary.topStory)
                                .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                                .foregroundStyle(DesignTokens.Text.primary)
                                .lineLimit(3)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    // Topics list
                    if !displayTopics.isEmpty {
                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                            ForEach(displayTopics) { topic in
                                topicRow(topic)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            } else {
                emptyRow
            }
        }
        .padding(DesignTokens.Spacing.md)
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [DesignTokens.Background.primary, DesignTokens.Background.elevated],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    private func topicRow(_ topic: SharedTrendingTopic) -> some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            Circle()
                .fill(importanceColor(topic.importance))
                .frame(width: 6, height: 6)
            Text(topic.title)
                .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(1)
        }
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

    private var emptyRow: some View {
        HStack {
            Spacer()
            Text("Trending data will appear here")
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
            Spacer()
        }
        .frame(maxHeight: .infinity)
    }
}
