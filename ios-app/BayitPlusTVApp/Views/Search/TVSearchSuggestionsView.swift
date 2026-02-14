import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS-optimized search suggestions showing trending and recent searches
/// as horizontally scrollable GlassChip rows for Siri Remote navigation.
struct TVSearchSuggestionsView: View {
    @Environment(LocalizationManager.self) private var localization
    let trendingSearches: [String]
    let recentSearches: [String]
    let onSelect: (String) -> Void
    let onClearRecent: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xl) {
            if !trendingSearches.isEmpty {
                trendingSection
            }
            if !recentSearches.isEmpty {
                recentSection
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.top, TVDesignTokens.Spacing.lg)
    }

    // MARK: - Trending

    private var trendingSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundColor(DesignTokens.Primary.default)
                    .accessibilityHidden(true)

                Text(localization.t("search.trendingSearches"))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)
            }
            .accessibilityElement(children: .combine)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(trendingSearches, id: \.self) { query in
                        GlassChip(title: query, isSelected: false) {
                            onSelect(query)
                        }
                        .accessibilityLabel("Search for \(query)")
                    }
                }
                .padding(.vertical, TVDesignTokens.Spacing.sm)
            }
            .focusSection()
            .accessibilityLabel("Trending searches")
        }
    }

    // MARK: - Recent

    private var recentSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            HStack {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundColor(DesignTokens.Text.secondary)
                        .accessibilityHidden(true)

                    Text(localization.t("search.recentSearches"))
                        .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.primary)
                }

                Spacer()

                GlassButton(
                    "Clear",
                    variant: .ghost,
                    size: .small
                ) {
                    onClearRecent()
                }
                .tvFocusStyle()
                .accessibilityLabel("Clear recent searches")
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(recentSearches, id: \.self) { query in
                        GlassChip(title: query, isSelected: false) {
                            onSelect(query)
                        }
                        .accessibilityLabel("Search for \(query)")
                    }
                }
                .padding(.vertical, TVDesignTokens.Spacing.sm)
            }
            .focusSection()
            .accessibilityLabel("Recent searches")
        }
    }
}
