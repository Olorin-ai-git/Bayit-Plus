import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Small Trending News widget: top story headline.
struct TrendingNewsSmallView: View {
    let entry: TrendingNewsEntry

    var body: some View {
        if let summary = entry.summary {
            Link(destination: WidgetDeepLinks.trending) {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    // Icon and label
                    HStack(spacing: DesignTokens.Spacing.xs) {
                        Image(systemName: "chart.line.uptrend.xyaxis")
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Primary.p400)
                        Text("Trending")
                            .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }

                    Spacer()

                    // Top story
                    Text(summary.topStory)
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(3)

                    // Mood badge
                    Text(summary.overallMood.capitalized)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .padding(.horizontal, DesignTokens.Spacing.xs)
                        .padding(.vertical, 2)
                        .background(
                            Capsule().fill(DesignTokens.Glass.bg)
                        )
                }
                .padding(DesignTokens.Spacing.md)
            }
            .containerBackground(for: .widget) {
                LinearGradient(
                    colors: [DesignTokens.Background.primary, DesignTokens.Background.elevated],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            }
        } else {
            emptyState
        }
    }

    private var emptyState: some View {
        Link(destination: WidgetDeepLinks.trending) {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .font(.system(size: DesignTokens.FontSize.xxl))
                    .foregroundStyle(DesignTokens.Text.muted)
                Text("No trending data")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(DesignTokens.Spacing.md)
        }
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [DesignTokens.Background.primary, DesignTokens.Background.elevated],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }
}
