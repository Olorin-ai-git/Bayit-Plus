import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Toolbar row with sort and filter buttons between filter pills and content in tvOS search.
struct TVSearchToolbarView: View {
    @Environment(LocalizationManager.self) private var localization
    let sortOption: SearchSortOption
    let activeFilterCount: Int
    let onSortTap: () -> Void
    let onFilterTap: () -> Void

    var body: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            GlassButton(
                sortLabel,
                variant: sortOption != .relevance ? .primary : .secondary,
                size: .small,
                icon: Image(systemName: "arrow.up.arrow.down")
            ) {
                onSortTap()
            }
            .tvCardStyle()

            Spacer()

            GlassButton(
                filterLabel,
                variant: activeFilterCount > 0 ? .primary : .secondary,
                size: .small,
                icon: Image(systemName: "line.3.horizontal.decrease")
            ) {
                onFilterTap()
            }
            .tvCardStyle()
        }
        .focusSection()
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.sm)
    }

    private var sortLabel: String {
        localization.t(sortOption.localizationKey)
    }

    private var filterLabel: String {
        if activeFilterCount > 0 {
            return "\(localization.t("search.filters.title")) (\(activeFilterCount))"
        }
        return localization.t("search.filters.title")
    }
}
