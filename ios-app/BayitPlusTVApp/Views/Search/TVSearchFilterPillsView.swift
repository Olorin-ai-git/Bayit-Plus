import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Horizontal row of content type filter pills for tvOS search.
struct TVSearchFilterPillsView: View {
    @Environment(LocalizationManager.self) private var localization
    @Binding var selectedFilter: SearchContentTypeFilter
    let onFilterChanged: (SearchContentTypeFilter) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(SearchContentTypeFilter.allCases, id: \.self) { filter in
                    GlassChip(
                        title: localization.t(filter.localizationKey),
                        isSelected: selectedFilter == filter
                    ) {
                        onFilterChanged(filter)
                    }
                    .accessibilityLabel("\(localization.t(filter.localizationKey)) filter")
                }
            }
            .padding(.vertical, TVDesignTokens.Spacing.sm)
        }
        .focusSection()
        .accessibilityLabel(localization.t("search.filters.title"))
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
    }
}
